import { useEffect, useState } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/api-client'
import { CallEventType, type Conversation } from '@/types/call-events'

/** Event kết thúc — phải cập nhật danh sách NGAY, không chờ gộp burst. */
const TERMINAL: string[] = [
  CallEventType.CallEnded,
  CallEventType.ConversationEnded,
]

/** Quá ngần này (ms) không nhận gì (event lẫn :ping ~5s) → coi kết nối câm, mở lại. */
const STALL_MS = 12_000
const WATCHDOG_TICK_MS = 3_000
/** Mạng có lại / quay về tab mà đã im quá ngần này → nối lại NGAY (không chờ STALL_MS). */
const STALE_GRACE_MS = 7_000

/**
 * Lắng nghe SSE TOÀN CỤC (/realtime/stream) để cập nhật realtime danh sách
 * Inbound + chỉ báo "đang diễn ra" ngay khi có cuộc gọi mới đến — không cần reload.
 *
 * Mỗi event thường → debounce ~500ms rồi invalidate query danh sách (gộp các burst).
 * Riêng event KẾT THÚC → cập nhật ngay (bỏ debounce) + gỡ cờ "live" tức thì để badge
 * không kẹt ở "đang diễn ra".
 *
 * `openWhenHidden: true` RẤT QUAN TRỌNG: nếu để mặc định (false), thư viện đóng kết nối
 * khi tab bị ẩn (vd lúc bạn chuyển sang terminal chạy webhook test). Bus realtime KHÔNG
 * phát lại event đã lỡ → event call.ended bị mất → danh sách kẹt ở "đang diễn ra" cho tới
 * khi reload tay. Giữ kết nối khi ẩn để luôn nhận được event kết thúc.
 */
export function useGlobalStream() {
  const qc = useQueryClient()
  const [reconnectNonce, setReconnectNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let touchLearning = false

    const flush = () => {
      // refetchType 'all' để refetch kể cả query tạm thời không có observer.
      qc.invalidateQueries({ queryKey: ['conversations'], exact: true, refetchType: 'all' })
      if (touchLearning) {
        qc.invalidateQueries({ queryKey: ['learning'], exact: true, refetchType: 'all' })
        touchLearning = false
      }
    }

    // Watchdog "kết nối câm" (xem use-call-stream): quá STALL_MS không nhận gì → mở lại.
    // /realtime/stream KHÔNG có replay nên reconnect xong flush() (ở onopen) để đồng bộ lại
    // danh sách, bù các event đã lỡ trong lúc đứt.
    let done = false
    const reconnect = () => {
      if (done) return
      done = true
      clearInterval(watchdog)
      controller.abort()
      setReconnectNonce((n) => n + 1)
    }
    let lastActivity = Date.now()
    const watchdog = setInterval(() => {
      if (Date.now() - lastActivity > STALL_MS) reconnect()
    }, WATCHDOG_TICK_MS)

    // Nối lại TỨC THÌ theo tín hiệu trình duyệt (xem use-call-stream): mạng có lại / quay về tab.
    const onOnline = () => reconnect()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity > STALE_GRACE_MS) {
        reconnect()
      }
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)

    fetchEventSource(`${API_BASE_URL}/realtime/stream`, {
      signal: controller.signal,
      openWhenHidden: true,
      onopen: async () => {
        lastActivity = Date.now()
        // Nếu đây là lần mở lại (sau khi câm), đồng bộ ngay danh sách để bù event đã lỡ.
        if (reconnectNonce > 0) flush()
      },
      onmessage: (msg) => {
        lastActivity = Date.now() // bất kỳ tin nào (kể cả ping) = còn sống
        if (msg.event === 'ping' || !msg.data) return
        let type: string | undefined
        let conversationId: string | undefined
        try {
          const ev = JSON.parse(msg.data) as { type?: string; conversationId?: string }
          type = ev.type
          conversationId = ev.conversationId
        } catch {
          /* bỏ qua parse lỗi */
        }

        if (type === CallEventType.LearningChecked) touchLearning = true

        if (type && TERMINAL.includes(type)) {
          // Gỡ "live" ngay trên cache để badge đổi tức thì (không chờ mạng),
          // status chính xác (completed/transferred/failed) do flush() refetch chốt lại.
          if (conversationId) {
            qc.setQueryData<Conversation[]>(['conversations'], (prev) =>
              prev?.map((c) =>
                c.id === conversationId && c.status === 'live'
                  ? { ...c, status: 'completed' }
                  : c,
              ),
            )
          }
          clearTimeout(timer)
          flush()
          return
        }

        clearTimeout(timer)
        timer = setTimeout(flush, 500)
      },
      onerror: () => {
        // không throw → thư viện tự reconnect với backoff
      },
    }).catch(() => {
      /* abort khi unmount */
    })

    return () => {
      clearInterval(watchdog)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      controller.abort()
      clearTimeout(timer)
    }
  }, [qc, reconnectNonce])
}
