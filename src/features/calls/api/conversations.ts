import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CallEvent, Conversation } from '@/types/call-events'

/** Danh sách cuộc hội thoại (lịch sử). */
export const conversationsQuery = () =>
  queryOptions({
    queryKey: ['conversations'],
    queryFn: () => apiClient.get<Conversation[]>('/conversations'),
  })

/**
 * Chi tiết một cuộc hội thoại.
 * refetchOnMount 'always' để mỗi lần mở chi tiết luôn lấy status/duration mới nhất
 * (quan trọng với cuộc đang diễn ra: thoát ra/vào lại không bị dữ liệu cũ).
 */
export const conversationQuery = (id: string) =>
  queryOptions({
    queryKey: ['conversations', id],
    queryFn: () => apiClient.get<Conversation>(`/conversations/${id}`),
    staleTime: 0,
    refetchOnMount: 'always',
  })

/**
 * Toàn bộ event đã lưu của một cuộc hội thoại (timeline).
 * refetchOnMount 'always' để khi mở/đóng/mở lại một cuộc đang diễn ra, các event
 * đã stream ở giữa (đã lưu DB) được nạp lại đầy đủ — không bị thiếu phần giữa.
 */
export const conversationEventsQuery = (id: string) =>
  queryOptions({
    queryKey: ['conversations', id, 'events'],
    queryFn: () => apiClient.get<CallEvent[]>(`/conversations/${id}/events`),
    staleTime: 0,
    refetchOnMount: 'always',
  })
