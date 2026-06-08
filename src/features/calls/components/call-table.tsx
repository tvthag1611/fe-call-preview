import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/biva/icon'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { StatusBadge } from './event-chip'
import { conversationsQuery } from '../api/conversations'
import { fmtDuration, fmtStartedAt } from '../lib/format'
import type { CallStatus, Conversation } from '@/types/call-events'

const FILTERS: { id: 'all' | CallStatus; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'live', label: 'Đang diễn ra' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'transferred', label: 'Đã chuyển agent' },
  { id: 'failed', label: 'Thất bại' },
]

const GRID = 'grid-cols-[1.35fr_1.05fr_1.5fr_1.3fr_0.7fr_1.05fr]'

function CallRow({ call, onOpen }: { call: Conversation; onOpen: (id: string) => void }) {
  const live = call.status === 'live'
  const rowName = live ? 'Chưa rõ' : call.customerName ?? '—'
  return (
    <button
      onClick={() => onOpen(call.id)}
      className={cn('group grid w-full items-center gap-4 border-t px-5 py-3.5 text-left transition-colors hover:bg-muted/50', GRID)}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {live && <span className="size-[7px] shrink-0 rounded-full bg-green-600 animate-pulse" />}
        <span className="truncate text-sm font-medium text-foreground">{call.id}</span>
      </div>
      <div className="truncate text-sm text-muted-foreground">{call.hotline ?? '—'}</div>
      <div className="min-w-0">
        <div className={cn('truncate text-sm font-medium', live ? 'text-muted-foreground' : 'text-foreground')}>{rowName}</div>
        <div className="mt-px text-[13px] text-muted-foreground">{call.customerPhone ?? ''}</div>
      </div>
      <div>
        <StatusBadge status={call.status} />
      </div>
      <div className="text-sm text-muted-foreground">
        {live ? <span className="font-medium text-green-600">live</span> : fmtDuration(call.durationSec)}
      </div>
      <div className="flex items-center justify-end gap-2.5">
        <span className="whitespace-nowrap text-sm text-muted-foreground">{fmtStartedAt(call.startedAt)}</span>
        <Icon name="chevron-right" size={15} className="text-border group-hover:text-muted-foreground" />
      </div>
    </button>
  )
}

export function CallList({ onOpen }: { onOpen: (id: string) => void }) {
  const { data: calls = [], isLoading } = useQuery(conversationsQuery())
  const [filter, setFilter] = useState<'all' | CallStatus>('all')
  const [q, setQ] = useState('')

  const rows = useMemo(
    () =>
      calls.filter((c) => {
        if (filter !== 'all' && c.status !== filter) return false
        if (q.trim()) {
          const s = `${c.customerName ?? ''} ${c.customerPhone ?? ''} ${c.id} ${c.hotline ?? ''}`.toLowerCase()
          if (!s.includes(q.toLowerCase())) return false
        }
        return true
      }),
    [calls, filter, q],
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-7 pt-7 pb-10">
        <div className="mb-5">
          <h1 className="text-[26px] font-bold tracking-tight">Inbound</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Theo dõi realtime và xem lại lịch sử hội thoại của bot tổng đài đặt vé.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex gap-0.5 rounded-lg bg-muted p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium',
                  f.id === filter ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-[280px]">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, SĐT, mã hội thoại…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card className="mt-3.5 gap-0 overflow-hidden py-0">
          <div className={cn('grid gap-4 px-5 py-3 text-[13px] font-medium whitespace-nowrap text-muted-foreground', GRID)}>
            <span>Mã hội thoại</span>
            <span>Hotline</span>
            <span>Khách hàng</span>
            <span>Trạng thái</span>
            <span>Thời lượng</span>
            <span className="text-right">Thời gian gọi</span>
          </div>
          {rows.map((c) => (
            <CallRow key={c.id} call={c} onOpen={onOpen} />
          ))}
          {rows.length === 0 && (
            <div className="border-t py-12 text-center text-muted-foreground">
              <Icon name="search-x" size={28} className="mx-auto text-border" />
              <div className="mt-2.5 text-sm">{isLoading ? 'Đang tải…' : 'Không có cuộc gọi nào khớp bộ lọc.'}</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
