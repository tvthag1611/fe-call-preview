import { create } from 'zustand'

/**
 * Store UI dùng chung (ví dụ mẫu cho cấu trúc zustand).
 * State nghiệp vụ realtime nên đặt theo từng feature.
 */
interface UiState {
  /** Cuộc hội thoại đang được chọn xem ở panel chi tiết. */
  selectedConversationId: string | null
  selectConversation: (id: string | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedConversationId: null,
  selectConversation: (id) => set({ selectedConversationId: id }),
}))
