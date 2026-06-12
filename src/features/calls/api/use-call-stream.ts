import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { API_BASE_URL } from '@/lib/api-client'
import { CallEventType, lifecycleRank, type CallEvent } from '@/types/call-events'

/**
 * Trục sắp xếp CHÍNH = `occurredAt` (mốc sự kiện THẬT theo nền tảng gọi); khi trùng mốc
 * mili-giây thì phân định bằng hạng lifecycle, cuối cùng `seq` (thứ tự ghi) phá hòa.
 * Đây là cùng comparator BE dùng cho REST (conversations.service.ts) → snapshot REST và
 * stream SSE xếp y hệt nhau.
 *
 * Vì sao KHÔNG lấy `seq` (thứ tự đến) làm chính: event tới BE không theo đúng thứ tự xảy
 * ra — vd kết quả `search_trips` (occurredAt 16.946) về SAU một TTS (17.149) nên seq lớn
 * hơn; xếp theo seq sẽ đẩy nó xuống sai chỗ. Xếp theo occurredAt mới đúng diễn biến.
 *
 * Caveat có ý thức: occurredAt KHÔNG khớp tuyệt đối với thanh audio (BE không sinh
 * audioOffsetMs). Timeline và trình phát ghi âm là hai đồng hồ độc lập — click-to-seek
 * chỉ gần đúng (xem use-audio-playback.ts).
 */
function compareEvents(a: CallEvent, b: CallEvent): number {
  const ta = new Date(a.occurredAt).getTime()
  const tb = new Date(b.occurredAt).getTime()
  if (ta !== tb) return ta - tb
  const ra = lifecycleRank(a.type)
  const rb = lifecycleRank(b.type)
  if (ra !== rb) return ra - rb
  return (a.seq ?? 0) - (b.seq ?? 0)
}

/**
 * Gộp `coordination.result` trùng theo `holdId`: nền tảng log lặp một phản hồi (cùng
 * holdId, cùng nội dung) thành nhiều bản id khác nhau → dedup-theo-id KHÔNG bắt được,
 * gây hiện 2 dòng "Phản hồi từ Zalo" giống hệt. Giữ bản `seq` LỚN NHẤT mỗi holdId (bản
 * mới nhất — cũng đúng khi answers được cập nhật dần). Loại khác giữ nguyên.
 */
function dedupeCoordinationResults(events: CallEvent[]): CallEvent[] {
  const lastSeq = new Map<string, number>()
  for (const e of events) {
    if (e.type !== CallEventType.CoordinationResult) continue
    const holdId = (e.payload as { holdId?: string } | undefined)?.holdId
    if (!holdId) continue
    lastSeq.set(holdId, Math.max(lastSeq.get(holdId) ?? -1, e.seq ?? 0))
  }
  if (lastSeq.size === 0) return events
  return events.filter((e) => {
    if (e.type !== CallEventType.CoordinationResult) return true
    const holdId = (e.payload as { holdId?: string } | undefined)?.holdId
    if (!holdId) return true
    return (e.seq ?? 0) === lastSeq.get(holdId)
  })
}

export type StreamStatus = 'connecting' | 'open' | 'closed' | 'error'

/**
 * Subscribe dòng sự kiện realtime (SSE) của một cuộc hội thoại và GỘP với các
 * event đã lưu (initialEvents) — dedupe theo id, sắp theo `seq` — để khi mở
 * một cuộc đang diễn ra giữa chừng vẫn thấy đầy đủ từ đầu, không mất phần trước.
 *
 * Lưu ý: chỉ subscribe lại khi conversationId đổi; initialEvents thay đổi (load
 * xong / refetch) được merge mà KHÔNG ngắt kết nối SSE.
 */
export function useCallStream(
  conversationId: string | undefined,
  initialEvents: CallEvent[] = [],
) {
  const [streamed, setStreamed] = useState<CallEvent[]>([])
  const [status, setStatus] = useState<StreamStatus>('closed')

  // seq cao nhất đã có từ REST (initialEvents). Seed làm `Last-Event-ID` ở lần connect
  // ĐẦU để BE phát lại phần lỡ giữa lúc REST chụp snapshot và lúc SSE mở. Dùng ref vì
  // effect chỉ chạy lại khi đổi conversationId — đọc giá trị mới nhất tại thời điểm connect.
  const seedSeq = useMemo(
    () => initialEvents.reduce((m, e) => Math.max(m, e.seq ?? 0), 0),
    [initialEvents],
  )
  const seedSeqRef = useRef(0)
  seedSeqRef.current = seedSeq

  useEffect(() => {
    if (!conversationId) return

    const controller = new AbortController()
    setStreamed([])
    setStatus('connecting')

    // Key viết thường khớp đúng tên header thư viện tự ghi đè khi nhận event có `id`,
    // nhờ vậy các lần reconnect sau dùng seq mới nhất chứ không kẹt ở seed ban đầu.
    const headers: Record<string, string> =
      seedSeqRef.current > 0 ? { 'last-event-id': String(seedSeqRef.current) } : {}

    fetchEventSource(`${API_BASE_URL}/conversations/${conversationId}/stream`, {
      signal: controller.signal,
      headers,
      // Giữ kết nối khi tab bị ẩn (mặc định thư viện sẽ đóng) để không lỡ event
      // realtime lúc người dùng chuyển cửa sổ.
      openWhenHidden: true,
      // headers: { Authorization: `Bearer ${token}` }, // gắn token khi có auth
      onopen: async () => {
        setStatus('open')
      },
      onmessage: (msg) => {
        // Bỏ qua heartbeat (event 'ping' giữ kết nối sống) và tin rỗng.
        if (msg.event === 'ping' || !msg.data) return
        let event: CallEvent
        try {
          event = JSON.parse(msg.data) as CallEvent
        } catch {
          return // dữ liệu không phải JSON (vd ping) → bỏ qua
        }
        // Upsert theo id: event phát lại với payload mới (vd summary/endcall được BE
        // cập nhật, hoặc replay khi reconnect) sẽ THAY bản cũ thay vì bị bỏ qua →
        // giao diện cập nhật ngay. `events` memo sort theo seq nên thứ tự vẫn đúng.
        setStreamed((prev) => {
          const i = prev.findIndex((e) => e.id === event.id)
          if (i === -1) return [...prev, event]
          const next = prev.slice()
          next[i] = event
          return next
        })
      },
      onerror: () => {
        setStatus('error')
        // không throw → thư viện tự reconnect với backoff
      },
      onclose: () => {
        setStatus('closed')
      },
    }).catch(() => {
      // bị abort khi unmount -> bỏ qua
    })

    return () => {
      controller.abort()
      setStatus('closed')
    }
  }, [conversationId])

  // gộp event đã lưu + event nhận qua SSE, dedupe theo id, sắp theo composite order
  const events = useMemo(() => {
    const map = new Map<string, CallEvent>()
    for (const e of initialEvents) map.set(e.id, e)
    for (const e of streamed) map.set(e.id, e)
    return dedupeCoordinationResults([...map.values()].sort(compareEvents))
  }, [initialEvents, streamed])

  return { events, status }
}
