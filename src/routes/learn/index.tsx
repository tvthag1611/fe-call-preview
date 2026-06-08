import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/biva/icon'
import { cn } from '@/lib/utils'
import { learningQuery } from '@/features/learn/api'
import { LearnCard } from '@/features/learn/components/learn-card'

export const Route = createFileRoute('/learn/')({
  component: LearnListPage,
})

const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'open', label: 'Cần xử lý' },
  { id: 'taught', label: 'Đã dạy' },
] as const

function LearnListPage() {
  const navigate = useNavigate()
  const { data: items = [], isLoading } = useQuery(learningQuery())
  const [filter, setFilter] = useState<'all' | 'open' | 'taught'>('all')

  const rows = items.filter((l) =>
    filter === 'all'
      ? true
      : filter === 'open'
        ? l.status === 'open' || l.status === 'review'
        : l.status === 'taught',
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-7 pt-7 pb-11">
        <div className="mb-[18px]">
          <h1 className="text-[26px] font-bold tracking-tight">Bot cần học</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Những câu hỏi bot chưa trả lời tốt hoặc ý định còn thiếu — bổ sung để bot tự xử lý ở các cuộc gọi sau.
          </p>
        </div>

        <div className="mb-[18px] inline-flex gap-0.5 rounded-lg bg-muted p-0.5">
          {TABS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'cursor-pointer rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold',
                f.id === filter ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {rows.map((l) => (
            <LearnCard key={l.id} item={l} onOpen={(it) => navigate({ to: '/learn/$id', params: { id: it.id } })} />
          ))}
        </div>
        {rows.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Icon name="graduation-cap" size={28} className="mx-auto text-border" />
            <div className="mt-2.5 text-sm">{isLoading ? 'Đang tải…' : 'Không có phiếu học nào.'}</div>
          </div>
        )}
      </div>
    </div>
  )
}
