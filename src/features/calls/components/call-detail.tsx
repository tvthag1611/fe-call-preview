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
import { CallEventType, type CallEvent, type CallSummaryPayload } from '@/types/call-events'

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

/**
 * `conversation_id` dạng "YYYYMMDDhhmmss_<hex>" là cuộc gọi từ tổng đài → CHẮC CHẮN có
 * webhook summary (kèm ghi âm) gửi về sau khi kết thúc. Dạng khác thì không có summary.
 * Dùng để quyết định footer: đang chờ summary ("đang tóm tắt") hay thực sự không có ghi âm.
 */
const FROM_SWITCHBOARD = /^\d{14}_[0-9a-f]+$/i

export function CallDetail({ conversationId, onClose, onOpenLearn }: {
  conversationId: string
  onClose: () => void
  onOpenLearn: () => void
}) {
  const qc = useQueryClient()
  const { data: call } = useQuery(conversationQuery(conversationId))
  const { data: stored = [] } = useQuery(conversationEventsQuery(conversationId))

  const isLive = call?.status === 'live'

  // NGUỒN TIMELINE DUY NHẤT: SSE per-conversation mở suốt thời gian panel mở (không buộc
  // vào isLive). Nhờ vậy MỌI event của cuộc này — đến lúc nào, kể cả summary/đặt vé tới
  // SAU endcall — đều được đẩy về và hiển thị ngay, không cần timer/đoán. SSE đã có
  // heartbeat + replay theo Last-Event-ID nên giữ mở lâu vẫn ổn định và rẻ.
  const { events: timeline } = useCallStream(conversationId, stored)

  // thời lượng: ưu tiên durationSec; nếu chưa có thì suy từ mốc event trong timeline
  const duration =
    call?.durationSec && call.durationSec > 0
      ? call.durationSec
      : timeline.length >= 2
        ? Math.max(
            1,
            Math.round(
              (new Date(timeline[timeline.length - 1].occurredAt).getTime() -
                new Date(timeline[0].occurredAt).getTime()) /
                1000,
            ),
          )
        : 0
  // Ghi âm: ưu tiên audio trong payload event call.summary (đúng dữ liệu thật),
  // fallback bản tổng hợp call.summary (có thể trống nếu aggregate chưa cập nhật).
  // Audio & cờ trạng thái rút từ TIMELINE đầy đủ (không phải bản đã cắt theo playback),
  // để footer không nhấp nháy khi đang tua dở.
  const summaryFromEvent = timeline.find((e) => e.type === CallEventType.CallSummary)
    ?.payload as CallSummaryPayload | undefined
  const audioUrl = summaryFromEvent?.audio ?? call?.summary?.audio ?? undefined
  const sawTerminal = timeline.some((e) => TERMINAL.includes(e.type))
  const hasSummary = timeline.some((e) => e.type === CallEventType.CallSummary)

  const { count, controls, audioRef } = useAudioPlayback(timeline, duration, audioUrl)

  // Chỉ "phát lại" (lộ dần theo đầu phát ghi âm, count) khi CÓ audio. Đang live hoặc
  // không có bản ghi âm → hiện ĐẦY ĐỦ ngay, không gate theo count.
  const events: CallEvent[] = isLive || !audioUrl ? timeline : timeline.slice(0, count)

  useEffect(() => {
    // Làm tươi aggregate conversation (status/summary/tên khách/durationSec) khi cuộc gọi
    // kết thúc HOẶC summary đã về — các trường này nằm ở REST, không đi qua SSE event.
    // Chạy 1 lần khi cờ bật (cờ là boolean ổn định) nên không lặp.
    if (sawTerminal || hasSummary) {
      qc.invalidateQueries({ queryKey: ['conversations', conversationId], exact: true })
      qc.invalidateQueries({ queryKey: ['conversations'], exact: true })
    }
  }, [sawTerminal, hasSummary, conversationId, qc])

  const last = events[events.length - 1]
  const runningIndex = isLive && last && isRunningType(last.type) && !sawTerminal ? events.length - 1 : -1

  const elapsed = useElapsed(call?.startedAt, !!isLive)

  if (!call) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Đang tải…</div>
  }

  // Footer: đang gọi → chỉ báo live; đã có ghi âm → trình phát; cuộc tổng đài chưa có
  // summary → "đang tóm tắt" (SSE vẫn mở nên có summary là tự chuyển); còn lại → không ghi âm.
  const fromSwitchboard = FROM_SWITCHBOARD.test(conversationId)
  const footer: 'live' | 'player' | 'summarizing' | 'no-audio' = isLive
    ? 'live'
    : audioUrl
      ? 'player'
      : fromSwitchboard && !hasSummary
        ? 'summarizing'
        : 'no-audio'

  const identified = !isLive || hasSummary || sawTerminal
  const displayName = identified ? call.customerName ?? 'Chưa rõ' : 'Chưa rõ'
  const displayInitials = identified ? initialsOf(call.customerName) : '?'

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

      {/* bottom — chỉ báo live / đang tóm tắt / không ghi âm / trình phát ghi âm */}
      <div className="border-t bg-card px-6 py-3.5">
        {footer === 'live' ? (
          <div className="flex items-center gap-3 text-green-600">
            <span className="size-[9px] rounded-full bg-green-600 animate-pulse" />
            <span className="text-[13.5px] font-semibold text-green-700">Đang ghi âm cuộc gọi trực tiếp</span>
            <Waveform />
            <span className="ml-auto font-mono text-sm font-semibold">{elapsed}</span>
          </div>
        ) : footer === 'summarizing' ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Icon name="loader-circle" size={17} className="animate-spin text-primary" />
            <span className="text-[13.5px] font-semibold text-foreground">Đang tóm tắt cuộc gọi…</span>
            <span className="text-xs text-muted-foreground">Đang chờ bản ghi âm & tóm tắt từ tổng đài</span>
          </div>
        ) : footer === 'no-audio' ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Icon name="mic-off" size={16} />
            <span className="text-[13.5px] font-medium">Cuộc gọi đã kết thúc — không có bản ghi âm</span>
          </div>
        ) : (
          <AudioPlayer controls={controls} audioUrl={audioUrl} audioRef={audioRef} />
        )}
      </div>
    </div>
  )
}
