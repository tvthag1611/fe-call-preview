import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { API_BASE_URL } from '@/lib/api-client'
import type { CallEvent } from '@/types/call-events'

export type StreamStatus = 'connecting' | 'open' | 'closed' | 'error'

/**
 * Subscribe dòng sự kiện realtime (SSE) của một cuộc hội thoại và GỘP với các
 * event đã lưu (initialEvents) — dedupe theo id, sắp theo occurredAt — để khi mở
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

  useEffect(() => {
    if (!conversationId) return

    const controller = new AbortController()
    seen.current = new Set()
    setStreamed([])
    setStatus('connecting')

    fetchEventSource(`${API_BASE_URL}/conversations/${conversationId}/stream`, {
      signal: controller.signal,
      // headers: { Authorization: `Bearer ${token}` }, // gắn token khi có auth
      onopen: async () => {
        setStatus('open')
      },
      onmessage: (msg) => {
        if (!msg.data) return
        const event = JSON.parse(msg.data) as CallEvent
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

  // gộp event đã lưu + event nhận qua SSE, dedupe theo id, sắp theo thời gian
  const events = useMemo(() => {
    const map = new Map<string, CallEvent>()
    for (const e of initialEvents) map.set(e.id, e)
    for (const e of streamed) map.set(e.id, e)
    return [...map.values()].sort((a, b) =>
      a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0,
    )
  }, [initialEvents, streamed])

  return { events, status }
}
