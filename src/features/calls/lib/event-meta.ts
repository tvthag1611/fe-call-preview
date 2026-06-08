/**
 * Map event model THẬT (xem @/types/call-events) sang icon + nhãn + lớp màu
 * Tailwind để hiển thị. Màu accent dành cho trạng thái, nền slate trung tính.
 */
import { CallEventType, type CallEvent } from '@/types/call-events'

/** Lớp màu theo category: `chip` cho ô icon (text/bg/border), `text` cho tiêu đề. */
export interface CatStyle {
  chip: string
  text: string
}

export const CAT_STYLE = {
  lifecycle: { chip: 'text-slate-600 bg-slate-100 border-slate-300', text: 'text-slate-600' },
  customer: { chip: 'text-slate-600 bg-slate-100 border-slate-300', text: 'text-slate-600' },
  bot: { chip: 'text-slate-800 bg-slate-200 border-slate-300', text: 'text-slate-800' },
  processing: { chip: 'text-yellow-700 bg-yellow-50 border-yellow-300', text: 'text-yellow-700' },
  tool: { chip: 'text-indigo-600 bg-indigo-50 border-indigo-200', text: 'text-foreground' },
  hold: { chip: 'text-amber-700 bg-orange-50 border-orange-200', text: 'text-amber-700' },
  coordination: { chip: 'text-violet-600 bg-violet-50 border-violet-200', text: 'text-violet-600' },
  transfer: { chip: 'text-cyan-600 bg-cyan-50 border-cyan-200', text: 'text-cyan-600' },
  danger: { chip: 'text-red-600 bg-red-50 border-red-200', text: 'text-red-600' },
  learn: { chip: 'text-orange-700 bg-orange-50 border-orange-200', text: 'text-orange-700' },
  ok: { chip: 'text-green-600 bg-green-50 border-green-200', text: 'text-green-600' },
  summary: { chip: 'text-slate-600 bg-slate-50 border-slate-200', text: 'text-slate-600' },
} satisfies Record<string, CatStyle>

export type Category = keyof typeof CAT_STYLE

export interface EventMeta {
  cat: Category
  icon: string
  label: string
}

export const EVENT_META: Record<string, EventMeta> = {
  [CallEventType.CallIncoming]: { cat: 'lifecycle', icon: 'phone-incoming', label: 'Cuộc gọi đến' },
  [CallEventType.CallAnswered]: { cat: 'lifecycle', icon: 'phone-call', label: 'Bot bắt máy' },
  [CallEventType.ConversationCreated]: { cat: 'lifecycle', icon: 'sparkles', label: 'Tạo phiên hội thoại' },
  [CallEventType.CustomerUtterance]: { cat: 'customer', icon: 'user', label: 'Khách nói' },
  [CallEventType.BotThinking]: { cat: 'processing', icon: 'loader-circle', label: 'Bot suy nghĩ' },
  [CallEventType.BotUtterance]: { cat: 'bot', icon: 'bot', label: 'Bot nói' },
  [CallEventType.BotToolCalled]: { cat: 'tool', icon: 'wrench', label: 'Gọi công cụ' },
  [CallEventType.BotToolResult]: { cat: 'tool', icon: 'check-check', label: 'Kết quả công cụ' },
  [CallEventType.CoordinationCalled]: { cat: 'coordination', icon: 'network', label: 'Điều phối' },
  [CallEventType.CoordinationResult]: { cat: 'coordination', icon: 'circle-check', label: 'Kết quả điều phối' },
  [CallEventType.CallHold]: { cat: 'hold', icon: 'pause', label: 'Giữ máy' },
  [CallEventType.CallUnhold]: { cat: 'hold', icon: 'play', label: 'Kết thúc giữ máy' },
  [CallEventType.CallTransferInitiated]: { cat: 'transfer', icon: 'arrow-right-left', label: 'Bắt đầu chuyển tiếp' },
  [CallEventType.CallTransferCompleted]: { cat: 'transfer', icon: 'user-check', label: 'Agent đã nhận máy' },
  [CallEventType.CallTransferFailed]: { cat: 'danger', icon: 'user-x', label: 'Chuyển tiếp thất bại' },
  [CallEventType.CallEnded]: { cat: 'lifecycle', icon: 'phone-off', label: 'Kết thúc cuộc gọi' },
  [CallEventType.ConversationEnded]: { cat: 'lifecycle', icon: 'phone-off', label: 'Kết thúc phiên' },
  [CallEventType.CallSummary]: { cat: 'summary', icon: 'clipboard-list', label: 'Tóm tắt cuộc gọi' },
  [CallEventType.LearningChecked]: { cat: 'learn', icon: 'graduation-cap', label: 'Kiểm tra điểm cần học' },
}

export function metaOf(type: string): EventMeta {
  return EVENT_META[type] ?? { cat: 'lifecycle', icon: 'circle', label: type }
}
export function catStyle(cat: Category): CatStyle {
  return CAT_STYLE[cat] ?? CAT_STYLE.lifecycle
}

/** Đọc payload an toàn (CallEvent là union, payload tuỳ type). */
export function payloadOf(ev: CallEvent): Record<string, unknown> {
  return (ev.payload as Record<string, unknown>) ?? {}
}

/** Phân loại kênh: lời khách (phải) / lời bot (trái) / sự kiện hệ thống. */
export function channelOf(type: string): 'customer' | 'bot' | 'system' {
  if (type === CallEventType.CustomerUtterance) return 'customer'
  if (type === CallEventType.BotUtterance) return 'bot'
  return 'system'
}

/** Các event "đang chạy": khi là event cuối lúc live → hiện spinner + nội dung đang làm. */
export const RUNNING_KIND: Record<string, Category> = {
  [CallEventType.BotThinking]: 'processing',
  [CallEventType.BotToolCalled]: 'tool',
  [CallEventType.CallHold]: 'hold',
  [CallEventType.CoordinationCalled]: 'coordination',
  [CallEventType.CallTransferInitiated]: 'transfer',
}
export function isRunningType(type: string): boolean {
  return type in RUNNING_KIND
}
export function runningLabel(ev: CallEvent): string | null {
  const p = payloadOf(ev)
  switch (ev.type) {
    case CallEventType.BotThinking:
      return 'Bot đang xử lý…'
    case CallEventType.BotToolCalled:
      return `Đang gọi công cụ ${(p.name as string) ?? ''}…`
    case CallEventType.CallHold:
      return 'Đang giữ máy…'
    case CallEventType.CoordinationCalled:
      return 'Đang điều phối với nhà xe…'
    case CallEventType.CallTransferInitiated:
      return 'Đang chuyển tiếp tới agent…'
    default:
      return null
  }
}

/** learning.checked: cam khi cần học, xanh khi không. */
export function learnOverride(ev: CallEvent): { chip: string; text: string; icon: string } {
  const needs = !!payloadOf(ev).needs
  return needs
    ? { ...CAT_STYLE.learn, icon: 'graduation-cap' }
    : { ...CAT_STYLE.ok, icon: 'circle-check' }
}

/** tool/coordination result là thất bại? (ok === false) */
export function isResultFail(ev: CallEvent): boolean {
  return payloadOf(ev).ok === false
}

/** Thời điểm tương đối "m:ss" của event thứ i so với event đầu. */
export function relTime(events: CallEvent[], i: number): string {
  if (!events.length) return '0:00'
  const t0 = new Date(events[0].occurredAt).getTime()
  const sec = Math.max(0, Math.round((new Date(events[i].occurredAt).getTime() - t0) / 1000))
  const m = Math.floor(sec / 60)
  const ss = String(sec % 60).padStart(2, '0')
  return `${m}:${ss}`
}

/** Mốc thời gian (giây) của từng event so với event đầu — cho audio scrubber. */
export function eventTimes(events: CallEvent[]): number[] {
  if (!events.length) return []
  const t0 = new Date(events[0].occurredAt).getTime()
  return events.map((e) => (new Date(e.occurredAt).getTime() - t0) / 1000)
}
