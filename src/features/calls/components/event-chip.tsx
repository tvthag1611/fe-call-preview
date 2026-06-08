import { Icon } from '@/components/biva/icon'
import { cn } from '@/lib/utils'
import { catStyle, metaOf } from '../lib/event-meta'
import type { CallStatus } from '@/types/call-events'

const CHIP_SIZE: Record<number, string> = {
  22: 'size-[22px]',
  26: 'size-[26px]',
  28: 'size-7',
  30: 'size-[30px]',
}

/** Ô icon nền màu mềm theo category. overrideChip/overrideIcon ép màu/glyph; spin xoay. */
export function EventChip({
  type,
  size = 28,
  overrideChip,
  overrideIcon,
  spin = false,
}: {
  type: string
  size?: number
  overrideChip?: string
  overrideIcon?: string
  spin?: boolean
}) {
  const meta = metaOf(type)
  const chip = overrideChip ?? catStyle(meta.cat).chip
  const icon = overrideIcon ?? meta.icon
  return (
    <span className={cn('inline-flex items-center justify-center rounded-md border', CHIP_SIZE[size] ?? 'size-7', chip)}>
      <Icon name={icon} size={Math.round(size * 0.54)} className={spin ? 'animate-spin' : undefined} />
    </span>
  )
}

/** 3 chấm "đang suy nghĩ" (kế thừa text color của cha). */
export function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      <span className="size-[5px] rounded-full bg-current animate-thinking" />
      <span className="size-[5px] rounded-full bg-current animate-thinking [animation-delay:0.15s]" />
      <span className="size-[5px] rounded-full bg-current animate-thinking [animation-delay:0.3s]" />
    </span>
  )
}

/** Sóng âm mini (đang ghi âm). */
export function Waveform() {
  return (
    <span className="inline-flex h-4 items-center gap-0.5">
      <span className="w-[3px] rounded-sm bg-current animate-eq" />
      <span className="w-[3px] rounded-sm bg-current animate-eq [animation-delay:0.12s]" />
      <span className="w-[3px] rounded-sm bg-current animate-eq [animation-delay:0.24s]" />
      <span className="w-[3px] rounded-sm bg-current animate-eq [animation-delay:0.36s]" />
      <span className="w-[3px] rounded-sm bg-current animate-eq [animation-delay:0.48s]" />
    </span>
  )
}

const STATUS_STYLE: Record<CallStatus, { label: string; cls: string; dot?: boolean }> = {
  live: { label: 'Đang diễn ra', cls: 'text-green-600 bg-green-50 border-green-200', dot: true },
  completed: { label: 'Hoàn thành', cls: 'text-slate-600 bg-slate-50 border-slate-200' },
  transferred: { label: 'Đã chuyển agent', cls: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  failed: { label: 'Thất bại', cls: 'text-red-600 bg-red-50 border-red-200' },
}

export function StatusBadge({ status, className }: { status: CallStatus; className?: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.completed
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold', s.cls, className)}>
      {s.dot && <span className="size-1.5 rounded-full bg-current animate-pulse" />}
      {s.label}
    </span>
  )
}
