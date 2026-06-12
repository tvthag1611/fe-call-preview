import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { API_BASE_URL } from '@/lib/api-client'
import { lifecycleRank, type CallEvent } from '@/types/call-events'

/**
 * Thứ tự hiển thị = `seq` (số thứ tự ghi tăng dần do BE gán, AUTO_INCREMENT) — đúng
 * diễn biến cuộc gọi. `occurredAt` CHỈ dùng để tính/hiển thị thời gian, KHÔNG sắp xếp.
 * Fallback hiếm (event thiếu `seq`): occurredAt → hạng lifecycle, để vẫn ổn định.
 */
function compareEvents(a: CallEvent, b: CallEvent): number {
  if (a.seq != null && b.seq != null) return a.seq - b.seq
  if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? -1 : 1
  return lifecycleRank(a.type) - lifecycleRank(b.type)
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
  const seen = useRef(new Set<string>())

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
    seen.current = new Set()
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
        if (seen.current.has(event.id)) return
        seen.current.add(event.id)
        setStreamed((prev) => [...prev, event])
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
    return [...map.values()].sort(compareEvents)
  }, [initialEvents, streamed])

  return { events, status }
}
