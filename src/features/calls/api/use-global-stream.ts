import { useEffect } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/api-client'
import { CallEventType } from '@/types/call-events'

/**
 * Lắng nghe SSE TOÀN CỤC (/realtime/stream) để cập nhật realtime danh sách
 * Inbound + chỉ báo "đang diễn ra" ngay khi có cuộc gọi mới đến — không cần reload.
 *
 * Mỗi event → debounce ~500ms rồi invalidate query danh sách (gộp các burst).
 * Chỉ refetch query LIST (exact) để không can thiệp luồng SSE theo từng cuộc gọi
 * ở màn chi tiết.
 */
export function useGlobalStream() {
  const qc = useQueryClient()

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let touchLearning = false

    const flush = () => {
      qc.invalidateQueries({ queryKey: ['conversations'], exact: true })
      if (touchLearning) {
        qc.invalidateQueries({ queryKey: ['learning'], exact: true })
        touchLearning = false
      }
    }

    fetchEventSource(`${API_BASE_URL}/realtime/stream`, {
      signal: controller.signal,
      onmessage: (msg) => {
        if (!msg.data) return
        try {
          const type = (JSON.parse(msg.data) as { type?: string }).type
          if (type === CallEventType.LearningChecked) touchLearning = true
        } catch {
          /* bỏ qua parse lỗi */
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
