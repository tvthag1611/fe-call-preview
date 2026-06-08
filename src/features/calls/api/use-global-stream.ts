import { useEffect } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/api-client'
import { CallEventType, type Conversation } from '@/types/call-events'

/** Event kết thúc — phải cập nhật danh sách NGAY, không chờ gộp burst. */
const TERMINAL: string[] = [
  CallEventType.CallEnded,
  CallEventType.ConversationEnded,
]

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

    fetchEventSource(`${API_BASE_URL}/realtime/stream`, {
      signal: controller.signal,
      openWhenHidden: true,
      onmessage: (msg) => {
        if (!msg.data) return
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
      controller.abort()
      clearTimeout(timer)
    }
  }, [qc])
}
