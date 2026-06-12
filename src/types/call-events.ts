/**
 * Định nghĩa các loại sự kiện realtime của một cuộc hội thoại + payload từng loại.
 *
 * QUAN TRỌNG: Bộ này phải giữ ĐỒNG BỘ với BE
 * (be-biva-preview/src/common/call-events.ts). Khi thêm/sửa loại event hoặc payload,
 * cập nhật ở CẢ HAI nơi.
 *
 * Lưu ý: dự án FE bật `erasableSyntaxOnly` nên KHÔNG dùng `enum` — thay bằng
 * object `as const` + union type.
 *
 * Ghi chú độ tin cậy của payload:
 *  - (THẬT)    : đã xác nhận từ data webhook thực tế của nền tảng gọi.
 *  - (suy đoán): tự thiết kế tạm, sẽ cập nhật khi có data thật.
 */

export const CallEventType = {
  /** Cuộc gọi đến. */
  CallIncoming: 'call.incoming',
  /** Bot bắt máy, bắt đầu tính thời lượng. */
  CallAnswered: 'call.answered',
  /** Phiên hội thoại AI được tạo. */
  ConversationCreated: 'conversation.created',
  /** Lời của khách. */
  CustomerUtterance: 'customer.utterance',
  /** Bot đang suy nghĩ. */
  BotThinking: 'bot.thinking',
  /** Lời của bot. */
  BotUtterance: 'bot.utterance',
  /** Bot gọi tool. */
  BotToolCalled: 'bot.tool_called',
  /** Kết quả tool. */
  BotToolResult: 'bot.tool_result',
  /** Bot bắt đầu điều phối. */
  CoordinationCalled: 'coordination.called',
  /** Bot nhận kết quả điều phối. */
  CoordinationResult: 'coordination.result',
  /** Hold máy. */
  CallHold: 'call.hold',
  /** Kết thúc hold máy. */
  CallUnhold: 'call.unhold',
  /** Bắt đầu chuyển tiếp. */
  CallTransferInitiated: 'call.transfer.initiated',
  /** Agent đã nhận máy. */
  CallTransferCompleted: 'call.transfer.completed',
  /** Agent bận/không nghe, bot quay lại tiếp nhận. */
  CallTransferFailed: 'call.transfer.failed',
  /** Kết thúc cuộc gọi (telephony). */
  CallEnded: 'call.ended',
  /** Kết thúc phiên hội thoại AI. */
  ConversationEnded: 'conversation.ended',
  /** Tóm tắt cuộc gọi. */
  CallSummary: 'call.summary',
  /** Bot xác định có cần học hay không. */
  LearningChecked: 'learning.checked',
} as const

export type CallEventType = (typeof CallEventType)[keyof typeof CallEventType]

/**
 * Thứ tự ngữ nghĩa của event LIFECYCLE — tiebreaker khi nhiều event CÙNG `occurredAt`.
 * Event giữa cuộc gọi mặc định 50, khi trùng mốc phân định tiếp bằng `seq`.
 * Giữ ĐỒNG BỘ với BE (be-biva-preview/src/common/call-events.ts).
 */
const LIFECYCLE_RANK: Partial<Record<CallEventType, number>> = {
  [CallEventType.CallIncoming]: 0,
  [CallEventType.ConversationCreated]: 1,
  [CallEventType.CallAnswered]: 2,
  [CallEventType.CallSummary]: 90,
  [CallEventType.ConversationEnded]: 95,
  [CallEventType.CallEnded]: 100,
}

/** Hạng lifecycle của một loại event (event giữa cuộc gọi → 50). */
export function lifecycleRank(type: CallEventType): number {
  return LIFECYCLE_RANK[type] ?? 50
}

/** Trạng thái của một cuộc hội thoại. */
export const ConversationStatus = {
  /** Đang đổ chuông (đã có call.incoming, chưa bắt máy). */
  Ringing: 'ringing',
  Active: 'active',
  OnHold: 'on_hold',
  Transferring: 'transferring',
  Ended: 'ended',
} as const

export type ConversationStatus =
  (typeof ConversationStatus)[keyof typeof ConversationStatus]

/**
 * Trạng thái hiển thị ở danh sách/header (badge) — khác pha realtime ở trên.
 * live: đang diễn ra · completed: hoàn thành · transferred: đã chuyển agent ·
 * failed: thất bại/gián đoạn.
 */
export const CallStatus = {
  Live: 'live',
  Completed: 'completed',
  Transferred: 'transferred',
  Failed: 'failed',
} as const

export type CallStatus = (typeof CallStatus)[keyof typeof CallStatus]

/* ────────────────────────────── Payload từng loại ────────────────────────── */

/** call.incoming */
export interface CallIncomingPayload {
  /** Số/định danh người gọi đến. (suy đoán) */
  from?: string
  /** Đầu số/hotline nhận cuộc gọi. (suy đoán) */
  to?: string
}

/** call.answered — thường không cần field, occurredAt là mốc bắt máy. */
export type CallAnsweredPayload = Record<string, never>

/** conversation.created */
export interface ConversationCreatedPayload {
  /** ID bot xử lý cuộc hội thoại. (THẬT) */
  botId: number
}

/** customer.utterance */
export interface CustomerUtterancePayload {
  /** Lời khách nói (sau STT). (suy đoán) */
  text: string
}

/** bot.thinking — không có payload trong thực tế. */
export type BotThinkingPayload = Record<string, never>

/** bot.utterance — một MẢNH TTS của lượt nói (nền tảng cắt 1 lượt thành nhiều mảnh). */
export interface BotUtterancePayload {
  /** Lời bot nói (một mảnh). (THẬT) */
  text: string
  /**
   * Cách ghép mảnh này vào lượt đang nói: (THẬT)
   *  - 'append' (mặc định): nối tiếp vào text đã có của lượt.
   *  - 'replace': text này là bản chốt, ĐÈ các mảnh trước của cùng lượt (không nối thêm).
   */
  mode?: 'append' | 'replace'
}

/** bot.tool_called */
export interface BotToolCalledPayload {
  /** Tên tool bot gọi. (THẬT) */
  name: string
  /** Tham số truyền vào tool. (THẬT) */
  args?: Record<string, unknown>
}

/** bot.tool_result */
export interface BotToolResultPayload {
  /** Tên tool. (THẬT) */
  name: string
  /** Tool chạy thành công hay không. (THẬT) */
  ok: boolean
  /** Thông báo lỗi khi ok=false. (THẬT) */
  error?: string
  /** Field khác tuỳ tool trả về (vd: saved, ready, fields, ...). (THẬT) */
  [key: string]: unknown
}

/** coordination.called */
export interface CoordinationCalledPayload {
  /** ID phiên giữ máy/điều phối — khớp với coordination.result. (THẬT) */
  holdId: string
  /** Câu hỏi bot gửi đi điều phối (nhờ chuyên viên xác nhận). (THẬT) */
  question: string
}

/** Một câu trả lời điều phối từ chuyên viên (vd nhắn trong nhóm Zalo). */
export interface CoordinationAnswer {
  /** ID tin trả lời. (THẬT) */
  id: string
  /** Nội dung trả lời — thường có @mention bot ở đầu. (THẬT) */
  text: string
  /** ID người gửi câu trả lời. (THẬT) */
  senderPid: string
  /** ISO timestamp khi trả lời. (THẬT) */
  createdAt: string
  /** Đã được thả reaction/đánh dấu chưa. (THẬT) */
  reacted?: boolean
}

/** coordination.result */
export interface CoordinationResultPayload {
  /** ID phiên — khớp với coordination.called. (THẬT) */
  holdId: string
  /** Đã có chuyên viên trả lời chưa. (THẬT) */
  answered: boolean
  /** Câu trả lời chốt (giữ nguyên @mention; FE tách phần @mention khi hiển thị). (THẬT) */
  answer?: string
  /** Toàn bộ các câu trả lời nhận được. (THẬT) */
  answers?: CoordinationAnswer[]
}

/** call.hold */
export interface CallHoldPayload {
  /** Lý do hold máy. (suy đoán) */
  reason?: string
}

/** call.unhold */
export interface CallUnholdPayload {
  /** Thời lượng đã hold (ms). (suy đoán) */
  durationMs?: number
}

/** call.transfer.initiated */
export interface CallTransferInitiatedPayload {
  /** Agent/bộ phận được chuyển tới. (suy đoán) */
  to?: string
  /** Lý do chuyển. (suy đoán) */
  reason?: string
}

/** call.transfer.completed */
export interface CallTransferCompletedPayload {
  /** Agent đã nhận máy. (suy đoán) */
  agent?: string
}

/** call.transfer.failed */
export interface CallTransferFailedPayload {
  /** Lý do thất bại (agent bận/không nghe). (suy đoán) */
  reason?: string
}

/** call.ended */
export interface CallEndedPayload {
  /** Bên kết thúc cuộc gọi. (suy đoán) */
  endedBy?: 'bot' | 'customer' | 'agent' | 'system'
  /** Lý do kết thúc. (suy đoán) */
  reason?: string
  /** Tổng thời lượng cuộc gọi (ms). (suy đoán) */
  durationMs?: number
}

/** conversation.ended — không có payload trong thực tế. */
export type ConversationEndedPayload = Record<string, never>

/** Một dòng field trong bảng tóm tắt (vd: "Tuyến đi" → "TP.HCM → Đà Lạt"). */
export interface CallSummaryField {
  label: string
  value: string
}

/**
 * call.summary — đúng format tóm tắt thật của Biva: dòng kết cục + mã vé,
 * meta (ghi âm), bảng field có cấu trúc, tags, bước tiếp theo.
 */
export interface CallSummaryPayload {
  /** Câu kết cục, vd "AI đã tự động đặt xe thành công". (THẬT) */
  outcome: string
  /** Tông màu kết cục. (suy đoán) */
  tone: 'good' | 'warn' | 'bad'
  /** Mã vé/đơn nếu có. (THẬT) */
  ticket?: string
  /** URL ghi âm cuộc gọi. (THẬT) */
  audio?: string
  /** Bảng thông tin có cấu trúc. (THẬT) */
  fields: CallSummaryField[]
  /** Nhãn phân loại nhanh. (suy đoán) */
  tags?: string[]
  /** Gợi ý bước tiếp theo. (suy đoán) */
  next?: string
}

/**
 * learning.checked — kết luận SAU khi kết thúc cuộc gọi: bot có cần học không.
 * Payload CHÍNH LÀ nội dung phiếu học: khi needs=true, phiếu được dựng trực tiếp
 * từ các field dưới đây (BE không bịa thêm). needs=false thì bỏ qua, không tạo phiếu.
 */
export interface LearningCheckedPayload {
  /** Có cần học không. Chỉ khi true mới sinh phiếu học. */
  needs: boolean
  /** Mã phiếu học. Thiếu thì BE tự sinh "L-xxxxxx". */
  ticketId?: string
  /** Loại thiếu sót: 'knowledge' (thiếu tri thức) | 'intent' (thiếu ý định). Mặc định 'knowledge'. */
  kind?: 'knowledge' | 'intent'
  /** Tiêu đề / chủ đề phiếu học. */
  title?: string
  /** Câu khách đã hỏi khiến bot bí. */
  question?: string
  /** Phân tích / ghi chú vì sao cần học. */
  note?: string
  /** Câu trả lời gợi ý sẵn (nếu có); để trống cho chuyên viên điền khi dạy. */
  answer?: string
  /** Số lần gặp tình huống này. Mặc định 1. */
  count?: number
}

/** Map loại event -> kiểu payload tương ứng. */
export interface CallEventPayloadMap {
  'call.incoming': CallIncomingPayload
  'call.answered': CallAnsweredPayload
  'conversation.created': ConversationCreatedPayload
  'customer.utterance': CustomerUtterancePayload
  'bot.thinking': BotThinkingPayload
  'bot.utterance': BotUtterancePayload
  'bot.tool_called': BotToolCalledPayload
  'bot.tool_result': BotToolResultPayload
  'coordination.called': CoordinationCalledPayload
  'coordination.result': CoordinationResultPayload
  'call.hold': CallHoldPayload
  'call.unhold': CallUnholdPayload
  'call.transfer.initiated': CallTransferInitiatedPayload
  'call.transfer.completed': CallTransferCompletedPayload
  'call.transfer.failed': CallTransferFailedPayload
  'call.ended': CallEndedPayload
  'conversation.ended': ConversationEndedPayload
  'call.summary': CallSummaryPayload
  'learning.checked': LearningCheckedPayload
}

/**
 * Một sự kiện đơn lẻ trong timeline (đã có id), dạng discriminated union theo `type`.
 * Nhờ vậy khi `switch (event.type)`, TypeScript tự thu hẹp kiểu của `payload`.
 */
export type CallEvent = {
  [K in keyof CallEventPayloadMap]: {
    id: string
    conversationId: string
    type: K
    /** ISO 8601 timestamp khi sự kiện xảy ra. */
    occurredAt: string
    /** Số thứ tự ghi tăng dần (BE gán) — tiebreaker khi `occurredAt` bằng nhau. */
    seq?: number
    payload?: CallEventPayloadMap[K]
  }
}[keyof CallEventPayloadMap]

/**
 * Bản ghi tổng quan một cuộc hội thoại (danh sách + header chi tiết).
 * Shape khớp với response của BE (conversation entity).
 */
export interface Conversation {
  id: string
  /** Trạng thái hiển thị (badge). */
  status: CallStatus
  /** Tên khách — null khi cuộc gọi đang diễn ra (chưa xác định → "Chưa rõ"). */
  customerName?: string | null
  /** SĐT khách (caller ID). */
  customerPhone?: string | null
  /** Hotline khách gọi vào. */
  hotline?: string | null
  /** ID bot xử lý (từ conversation.created). */
  botId?: number | null
  /** Đơn vị phụ trách, vd "Bot · Biva" / "Bot → Agent Minh". */
  agent?: string | null
  /** ISO timestamp bắt đầu. */
  startedAt: string
  /** ISO timestamp kết thúc. */
  endedAt?: string | null
  /** Thời lượng (giây) — có khi đã kết thúc. */
  durationSec?: number | null
  /** Số điểm bot cần học phát sinh từ cuộc gọi. */
  learnCount?: number
  /** Tóm tắt có cấu trúc (sinh khi kết thúc). */
  summary?: CallSummaryPayload | null
}

/** Một phiếu "bot cần học" sinh ra từ learning.checked. */
export interface LearningItem {
  id: string
  kind: 'knowledge' | 'intent'
  /** dismissed = đã đóng phiếu mà bot không cần học (nút "Không cần dạy"). */
  status: 'open' | 'review' | 'taught' | 'dismissed'
  title: string
  question: string
  conversationId: string
  callName: string
  /** ISO timestamp khi phát sinh. */
  occurredAt: string
  /** Số lần gặp tình huống này. */
  count: number
  note: string
  /** Câu trả lời chuẩn đã dạy (khi status=taught). */
  answer?: string | null
}
