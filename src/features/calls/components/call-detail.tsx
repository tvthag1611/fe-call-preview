import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@/components/biva/icon'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StatusBadge, Waveform } from './event-chip'
import { ConversationTimeline } from './conversation-timeline'
import { AudioPlayer } from './audio-player'
import { conversationQuery, conversationEventsQuery } from '../api/conversations'
import { useCallStream } from '../api/use-call-stream'
import { useAudioPlayback } from '../lib/use-audio-playback'
import { isRunningType } from '../lib/event-meta'
import { fmtDuration, fmtStartedAt, initialsOf } from '../lib/format'
import { CallEventType, type CallEvent } from '@/types/call-events'

function useElapsed(startISO: string | undefined, active: boolean): string {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  if (!startISO) return '0:00'
  return fmtDuration(Math.floor((now - new Date(startISO).getTime()) / 1000))
}

function MetaItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon name={icon} size={14} className="text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  )
}

const TERMINAL: string[] = [CallEventType.CallEnded, CallEventType.ConversationEnded]

export function CallDetail({ conversationId, onClose, onOpenLearn }: {
  conversationId: string
  onClose: () => void
  onOpenLearn: () => void
}) {
  const qc = useQueryClient()
  const { data: call } = useQuery(conversationQuery(conversationId))
  const { data: stored = [] } = useQuery(conversationEventsQuery(conversationId))

  const isLive = call?.status === 'live'
  const { events: liveEvents } = useCallStream(isLive ? conversationId : undefined, stored)

  // thời lượng: ưu tiên durationSec; nếu chưa có thì suy từ mốc event đã lưu
  const duration =
    call?.durationSec && call.durationSec > 0
      ? call.durationSec
      : stored.length >= 2
        ? Math.max(
            1,
            Math.round(
              (new Date(stored[stored.length - 1].occurredAt).getTime() -
                new Date(stored[0].occurredAt).getTime()) /
                1000,
            ),
          )
        : 0
  const { count, controls } = useAudioPlayback(stored, duration)

  const events: CallEvent[] = isLive ? liveEvents : stored.slice(0, count)

  const sawTerminal = events.some((e) => TERMINAL.includes(e.type))
  const sawSummary = events.some((e) => e.type === CallEventType.CallSummary)
  useEffect(() => {
    if (isLive && sawTerminal) qc.invalidateQueries({ queryKey: ['conversations'] })
  }, [isLive, sawTerminal, qc])

  const last = events[events.length - 1]
  const runningIndex = isLive && last && isRunningType(last.type) && !sawTerminal ? events.length - 1 : -1

  const elapsed = useElapsed(call?.startedAt, !!isLive)

  if (!call) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Đang tải…</div>
  }

  const identified = !isLive || sawSummary || sawTerminal
  const displayName = identified ? call.customerName ?? 'Chưa rõ' : 'Chưa rõ'
  const displayInitials = identified ? initialsOf(call.customerName) : '?'
  const audioUrl = call.summary?.audio

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div className="border-b bg-card px-6 py-3.5">
        <div className="flex items-center gap-3.5">
          <Button size="icon" variant="ghost" onClick={onClose} title="Đóng">
            <Icon name="x" size={18} />
          </Button>
          <Avatar className="size-[42px]">
            <AvatarFallback className={cn(isLive ? 'bg-green-100 text-green-600' : 'bg-secondary text-muted-foreground')}>
              {displayInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className={cn('whitespace-nowrap text-lg font-semibold tracking-tight', identified ? 'text-foreground' : 'text-muted-foreground')}>
                {displayName}
              </span>
              <StatusBadge status={call.status} />
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted-foreground">
              <Icon name="phone" size={12} /> {call.customerPhone ?? '—'}
              <span className="text-border">·</span>
              <code className="font-mono text-xs">{call.id}</code>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {isLive ? (
              <div className="flex items-center gap-2 font-mono text-[15px] font-semibold text-green-600">
                <span className="size-2 rounded-full bg-green-600 animate-pulse" />
                {elapsed}
              </div>
            ) : (
              <span className="font-mono text-[15px] font-semibold text-muted-foreground">{fmtDuration(call.durationSec)}</span>
            )}
          </div>
        </div>

        {/* meta: thời gian + điểm cần học */}
        <div className="mt-3 flex flex-wrap items-center gap-4 pl-14">
          <MetaItem icon="clock" label="Thời gian" value={fmtStartedAt(call.startedAt)} />
          {!!call.learnCount && call.learnCount > 0 && (
            <button
              onClick={onOpenLearn}
              className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700"
            >
              <Icon name="graduation-cap" size={14} /> {call.learnCount} điểm bot cần học
            </button>
          )}
        </div>
      </div>

      {/* body — transcript */}
      <div className="min-h-0 flex-1 bg-background">
        <ConversationTimeline call={call} events={events} runningIndex={runningIndex} />
      </div>

      {/* bottom — player ghi âm hoặc indicator live */}
      <div className="border-t bg-card px-6 py-3.5">
        {isLive ? (
          <div className="flex items-center gap-3 text-green-600">
            <span className="size-[9px] rounded-full bg-green-600 animate-pulse" />
            <span className="text-[13.5px] font-semibold text-green-700">Đang ghi âm cuộc gọi trực tiếp</span>
            <Waveform />
            <span className="ml-auto font-mono text-sm font-semibold">{elapsed}</span>
          </div>
        ) : (
          <AudioPlayer controls={controls} audioUrl={audioUrl} />
        )}
      </div>
    </div>
  )
}
