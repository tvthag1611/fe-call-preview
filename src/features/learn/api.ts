import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { LearningItem } from '@/types/call-events'

/** Danh sách phiếu "bot cần học". */
export const learningQuery = () =>
  queryOptions({
    queryKey: ['learning'],
    queryFn: () => apiClient.get<LearningItem[]>('/learning'),
  })

/** Chi tiết một phiếu học. */
export const learningItemQuery = (id: string) =>
  queryOptions({
    queryKey: ['learning', id],
    queryFn: () => apiClient.get<LearningItem>(`/learning/${id}`),
  })

export interface TeachBody {
  answer: string
  when?: string
  intent?: string
}

/** Dạy bot: lưu câu trả lời chuẩn → trạng thái taught. */
export function teachLearningItem(id: string, body: TeachBody) {
  return apiClient.post<LearningItem>(`/learning/${id}/teach`, body)
}
