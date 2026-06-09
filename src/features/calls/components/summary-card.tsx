import type { ReactNode } from 'react'
import { Icon } from '@/components/biva/icon'
import { cn } from '@/lib/utils'
import type { Conversation, CallSummaryPayload } from '@/types/call-events'

const TONE: Record<CallSummaryPayload['tone'], { wrap: string; text: string; icon: string }> = {
  good: { wrap: 'bg-green-50 border-green-200', text: 'text-green-600', icon: 'circle-check' },
  warn: { wrap: 'bg-orange-50 border-orange-200', text: 'text-amber-700', icon: 'arrow-right-left' },
  bad: { wrap: 'bg-red-50 border-red-200', text: 'text-red-600', icon: 'phone-off' },
}

function Meta({ icon, children, mono }: { icon: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon name={icon} size={13} className="shrink-0 text-muted-foreground" />
      <span className={cn('truncate text-xs font-medium text-foreground', mono && 'font-mono')}>{children}</span>
    </div>
  )
}

/** Field "rộng": value dài/nhiều dòng → trải hết chiều ngang thay vì 1 ô nửa bảng. */
function isWide(value: string): boolean {
  return value.includes('\n') || value.length > 44
}

/** Thẻ tóm tắt hậu cuộc gọi — đúng format thật của Biva. */
export function SummaryCard({ call, compact }: { call: Conversation; compact?: boolean }) {
  const s = call.summary
  if (!s) return null
  const t = TONE[s.tone] ?? TONE.good
  const fields = s.fields ?? []
  return (
    <div className={cn('animate-in fade-in slide-in-from-bottom-1 self-center overflow-hidden rounded-xl border bg-card shadow-sm duration-300', compact ? 'w-full' : 'w-[min(640px,96%)]')}>
      {/* banner trạng thái */}
      <div className={cn('flex items-center gap-3 border-b px-4 py-3', t.wrap)}>
        <span className={cn('inline-flex size-[30px] shrink-0 items-center justify-center rounded-full border bg-card', t.text, t.wrap)}>
          <Icon name={t.icon} size={17} />
        </span>
        <div className="min-w-0">
          <div className={cn('text-sm font-bold tracking-tight', t.text)}>{s.outcome}</div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">Tóm tắt cuộc gọi · tự động sinh khi kết thúc</div>
        </div>
        {s.ticket && (
          <code className={cn('ml-auto shrink-0 rounded-md border bg-card px-2.5 py-1.5 font-mono text-xs font-bold', t.text, t.wrap)}>
            Mã vé: {s.ticket}
          </code>
        )}
      </div>

      {/* meta: phone · id · audio */}
      <div className="flex flex-wrap items-center gap-4 border-b bg-muted px-4 py-2.5">
        {call.customerPhone && <Meta icon="phone">{call.customerPhone}</Meta>}
        <Meta icon="hash" mono>{call.id}</Meta>
        {s.audio && (
          <a
            href={s.audio}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-semibold text-primary no-underline"
          >
            <Icon name="volume-2" size={14} /> Nghe ghi âm
          </a>
        )}
      </div>

      {/* bảng field: nhãn · giá trị; value dài thì trải hết hàng */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-x-6">
          {fields.map((f, i) => (
            <div
              key={i}
              className={cn('flex gap-2.5 border-b py-1.5 last:border-b-0', isWide(f.value) && 'col-span-2')}
            >
              <span className="w-[116px] shrink-0 text-xs text-muted-foreground">{f.label}</span>
              <span className="text-[13px] font-semibold whitespace-pre-line text-foreground">{f.value}</span>
            </div>
          ))}
        </div>

        {s.tags && s.tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {s.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
