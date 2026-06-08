import { Icon } from '@/components/biva/icon'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { fmtStartedAt } from '@/features/calls/lib/format'
import type { LearningItem } from '@/types/call-events'

export const LEARN_STATUS: Record<LearningItem['status'], { label: string; cls: string }> = {
  open: { label: 'Cần xử lý', cls: 'text-orange-700 bg-orange-50 border-orange-200' },
  review: { label: 'Đang duyệt', cls: 'text-yellow-700 bg-yellow-50 border-yellow-300' },
  taught: { label: 'Đã dạy', cls: 'text-green-600 bg-green-50 border-green-200' },
}
export const KIND_META: Record<LearningItem['kind'], { label: string; icon: string }> = {
  knowledge: { label: 'Thiếu tri thức', icon: 'book-open' },
  intent: { label: 'Thiếu ý định', icon: 'git-branch' },
}

export function LearnStatusPill({ status }: { status: LearningItem['status'] }) {
  const s = LEARN_STATUS[status] ?? LEARN_STATUS.open
  return (
    <span className={cn('inline-flex h-[22px] items-center rounded-full border px-2.5 text-xs font-semibold', s.cls)}>
      {s.label}
    </span>
  )
}

export function LearnCard({ item, onOpen }: { item: LearningItem; onOpen: (item: LearningItem) => void }) {
  const k = KIND_META[item.kind]
  return (
    <Card
      onClick={() => onOpen(item)}
      className="cursor-pointer gap-0 p-[18px] transition-shadow hover:border-ring/40 hover:shadow-md"
    >
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          <Icon name={k.icon} size={13} /> {k.label}
        </span>
        <LearnStatusPill status={item.status} />
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Icon name="repeat" size={13} /> {item.count} lần
        </span>
      </div>
      <div className="text-[15px] font-semibold tracking-tight">{item.title}</div>
      <div className="mt-2 rounded-lg border-l-[3px] border-border bg-muted/50 px-3 py-2.5 text-[13.5px] italic leading-relaxed text-foreground">
        {item.question}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon name="phone" size={13} /> {item.callName}
        <code className="font-mono text-[11.5px]">{item.conversationId}</code>
        <span className="text-border">·</span>
        {fmtStartedAt(item.occurredAt)}
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          Dạy bot <Icon name="arrow-right" size={14} />
        </span>
      </div>
    </Card>
  )
}
