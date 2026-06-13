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
 * Quá ngần này (ms) KHÔNG nhận được gì (event LẪN heartbeat :ping ~3s của BE) thì coi kết
 * nối đã chết âm thầm và chủ động mở lại. ~> 2.5 nhịp ping để không reconnect oan khi 1 ping
 * tới trễ. Giảm cùng nhịp ping BE để phát hiện nhanh hơn (xem realtime.service.ts).
 */
const STALL_MS = 8_000
/** Nhịp kiểm tra "kết nối câm". */
const WATCHDOG_TICK_MS = 3_000
/**
 * Khi mạng có lại / quay về tab mà đã im quá ngần này thì nối lại NGAY (không chờ STALL_MS).
 * Đặt ~1 nhịp ping + đệm: im dưới mức này coi như kết nối còn khoẻ, khỏi reconnect oan.
 */
const STALE_GRACE_MS = 4_000

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
  // Tăng giá trị này để BUỘC mở lại kết nối (watchdog dùng khi phát hiện kết nối câm).
  const [reconnectNonce, setReconnectNonce] = useState(0)

  // Seed `Last-Event-ID` = seq CAO NHẤT đã biết của cuộc này (initialEvents + đã nhận qua
  // SSE). Khi (re)connect, BE replay phần seq lớn hơn → lấp đúng đoạn lỡ, không trùng/thiếu.
  // Running-max trong PHẠM VI một conversation; reset khi đổi conversation (seq là global
  // tăng dần nên seed của conv cũ có thể quá cao, làm conv mới bỏ sót đoạn cần replay).
  const seedSeq = useMemo(
    () => initialEvents.reduce((m, e) => Math.max(m, e.seq ?? 0), 0),
    [initialEvents],
  )
  const seedSeqRef = useRef(0)
  // Khi ĐỔI conversation: reset seed (seq là global tăng dần → seed của conv cũ có thể quá
  // cao, làm conv mới bỏ sót đoạn cần replay) và xoá event đã stream của conv cũ. KHÔNG đụng
  // hai cái này khi chỉ reconnect (watchdog) — giữ nguyên streamed rồi replay lấp đúng phần lỡ.
  useEffect(() => {
    seedSeqRef.current = 0
    setStreamed([])
  }, [conversationId])
  // Nâng seed theo seq cao nhất của initialEvents (REST có thể load/refetch sau lần connect).
  useEffect(() => {
    if (seedSeq > seedSeqRef.current) seedSeqRef.current = seedSeq
  }, [seedSeq])

  useEffect(() => {
    if (!conversationId) return

    const controller = new AbortController()
    setStatus('connecting')

    // Mở lại kết nối: abort luồng hiện tại + bump nonce → effect chạy lại, seed Last-Event-ID
    // cho BE replay phần đã lỡ. Gọi 1 lần (cờ done chặn gọi kép từ watchdog lẫn event mạng).
    let done = false
    const reconnect = () => {
      if (done) return
      done = true
      clearInterval(watchdog)
      controller.abort()
      setReconnectNonce((n) => n + 1)
    }

    // Watchdog phát hiện "kết nối câm": BE bắn heartbeat :ping ~3s, nên ở trạng thái bình
    // thường luôn có tin tới. Nếu quá STALL_MS KHÔNG nhận được gì (event LẪN ping), kết nối
    // coi như đã chết âm thầm (proxy/NAT cắt nhưng không bắn error → thư viện KHÔNG tự
    // reconnect) → mở lại. Đây là lưới chính chống "timeline đứng giữa cuộc gọi".
    let lastActivity = Date.now()
    const watchdog = setInterval(() => {
      if (Date.now() - lastActivity > STALL_MS) reconnect()
    }, WATCHDOG_TICK_MS)

    // Nối lại TỨC THÌ theo tín hiệu trình duyệt (không chờ STALL_MS) cho các ca trình duyệt
    // BIẾT là đứt: mạng vừa có lại (online) → SSE chắc chắn đã chết; quay về tab/cửa sổ
    // (visible/focus) mà đã im quá STALE_GRACE_MS → nhiều khả năng đã đứt lúc tab bị ẩn.
    const onOnline = () => reconnect()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity > STALE_GRACE_MS) {
        reconnect()
      }
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)

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
        lastActivity = Date.now()
        setStatus('open')
      },
      onmessage: (msg) => {
        lastActivity = Date.now() // BẤT KỲ tin nào (kể cả ping) = kết nối còn sống
        // Bỏ qua heartbeat (event 'ping' giữ kết nối sống) và tin rỗng.
        if (msg.event === 'ping' || !msg.data) return
        let event: CallEvent
        try {
          event = JSON.parse(msg.data) as CallEvent
        } catch {
          return // dữ liệu không phải JSON (vd ping) → bỏ qua
        }
        // Nâng seed để lần reconnect sau chỉ replay phần thật sự còn thiếu.
        if (event.seq != null && event.seq > seedSeqRef.current) {
          seedSeqRef.current = event.seq
        }
        // Upsert theo id: event phát lại với payload mới (vd summary/endcall được BE
        // cập nhật, hoặc replay khi reconnect) sẽ THAY bản cũ thay vì bị bỏ qua →
        // giao diện cập nhật ngay. `events` memo sort theo occurredAt nên thứ tự vẫn đúng.
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
        // không throw → thư viện tự reconnect với backoff (giữ last-event-id nội bộ)
      },
      onclose: () => {
        setStatus('closed')
      },
    }).catch(() => {
      // bị abort khi unmount / watchdog -> bỏ qua
    })

    return () => {
      clearInterval(watchdog)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      controller.abort()
      setStatus('closed')
    }
  }, [conversationId, reconnectNonce])

  // gộp event đã lưu + event nhận qua SSE, dedupe theo id, sắp theo composite order
  const events = useMemo(() => {
    const map = new Map<string, CallEvent>()
    for (const e of initialEvents) map.set(e.id, e)
    for (const e of streamed) map.set(e.id, e)
    return dedupeCoordinationResults([...map.values()].sort(compareEvents))
  }, [initialEvents, streamed])

  return { events, status }
}
