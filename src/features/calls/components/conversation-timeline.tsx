import { useEffect, useRef } from 'react'
import { Icon } from '@/components/biva/icon'
import { cn } from '@/lib/utils'
import { EventChip } from './event-chip'
import { SummaryCard } from './summary-card'
import {
  CAT_STYLE,
  catStyle,
  isResultFail,
  learnOverride,
  metaOf,
  payloadOf,
  relTime,
  runningLabel,
} from '../lib/event-meta'
import { CallEventType, type CallEvent, type Conversation } from '@/types/call-events'

function isSpeechType(t: string) {
  return t === CallEventType.CustomerUtterance || t === CallEventType.BotUtterance
}
function isActionType(t: string) {
  return !isSpeechType(t) && t !== CallEventType.CallSummary
}

/* ---------- bong bóng lời nói (bot trái / khách phải) ---------- */
function ChatBubble({ ev, time }: { ev: CallEvent; time: string }) {
  const isBot = ev.type === CallEventType.BotUtterance
  const text = (payloadOf(ev).text as string) ?? ''
  return (
    <div className={cn('mb-2.5 flex animate-in fade-in slide-in-from-bottom-1 duration-300', isBot ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[74%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isBot
            ? 'rounded-bl-[5px] bg-secondary text-foreground'
            : 'rounded-br-[5px] border border-blue-100 bg-blue-50 text-blue-900',
        )}
      >
        {text}
        <span className={cn('ml-2 whitespace-nowrap text-xs', isBot ? 'text-muted-foreground' : 'text-blue-500')}>· {time}</span>
      </div>
    </div>
  )
}

/* ---------- JSON box (key màu teal) ---------- */
function jsonLine(line: string, i: number) {
  const m = line.match(/^(\s*)"([^"]*)"(\s*:\s*)(.*)$/)
  if (m) {
    return (
      <div key={i} className="whitespace-pre">
        {m[1]}
        <span className="text-cyan-700">"{m[2]}"</span>
        {m[3]}
        <span className="text-foreground">{m[4]}</span>
      </div>
    )
  }
  return (
    <div key={i} className="whitespace-pre text-foreground">
      {line || ' '}
    </div>
  )
}
function JsonBlock({ value }: { value: unknown }) {
  let text: string
  try {
    text = JSON.stringify(value, null, 2)
  } catch {
    text = String(value)
  }
  return (
    <div className="mt-2.5 overflow-x-auto rounded-[10px] border bg-muted/40 px-3.5 py-3 font-mono text-xs leading-relaxed font-medium">
      {text.split('\n').map((l, i) => jsonLine(l, i))}
    </div>
  )
}

/* ---------- hàng hành động bot trên rail icon nối ---------- */
function ActionRow({ ev, time, running, prevAction, nextAction }: {
  ev: CallEvent
  time: string
  running: boolean
  prevAction: boolean
  nextAction: boolean
}) {
  const p = payloadOf(ev)
  const meta = metaOf(ev.type)
  const isToolCall = ev.type === CallEventType.BotToolCalled
  const isToolResult = ev.type === CallEventType.BotToolResult
  const isCoordResult = ev.type === CallEventType.CoordinationResult
  const isLearn = ev.type === CallEventType.LearningChecked
  const fail =
    (isToolResult && isResultFail(ev)) ||
    (isCoordResult && isResultFail(ev)) ||
    ev.type === CallEventType.CallTransferFailed
  const learnOv = isLearn ? learnOverride(ev) : null

  let title: string
  let titleClass: string
  let mono = false
  let overrideChip: string | undefined
  let overrideIcon: string | undefined
  let spin = false

  if (running) {
    title = runningLabel(ev) ?? meta.label
    titleClass = CAT_STYLE.processing.text
    overrideChip = CAT_STYLE.processing.chip
    overrideIcon = 'loader-circle'
    spin = true
  } else if (isToolCall || isToolResult) {
    title = (p.name as string) ?? meta.label
    mono = true
    titleClass = fail ? CAT_STYLE.danger.text : 'text-foreground'
    if (fail) {
      overrideChip = CAT_STYLE.danger.chip
      overrideIcon = 'triangle-alert'
    }
  } else if (isLearn && learnOv) {
    title = p.needs ? 'Đã tạo phiếu học' : 'Đã kiểm tra — không cần học'
    titleClass = learnOv.text
    overrideChip = learnOv.chip
    overrideIcon = learnOv.icon
  } else {
    title = meta.label
    titleClass = fail ? CAT_STYLE.danger.text : catStyle(meta.cat).text
    if (fail) overrideChip = CAT_STYLE.danger.chip
  }

  let detailVal: unknown = null
  if (isToolCall) detailVal = p.args ?? {}
  else if (isToolResult || isCoordResult) detailVal = fail ? { loi: p.error } : { ket_qua: p.result }

  const sub = !isToolCall && !isToolResult ? (p.reason as string) || (p.note as string) || (p.text as string) || '' : ''

  return (
    <div className="grid animate-in fade-in slide-in-from-bottom-1 grid-cols-[34px_1fr] gap-x-3 duration-300">
      <div className="flex flex-col items-center">
        <div className={cn('h-[7px] w-0.5', prevAction ? 'bg-border' : 'bg-transparent')} />
        <EventChip type={ev.type} size={28} overrideChip={overrideChip} overrideIcon={overrideIcon} spin={spin} />
        <div className={cn('min-h-2 w-0.5 flex-1', nextAction ? 'bg-border' : 'bg-transparent')} />
      </div>
      <div className={cn('min-w-0 pt-1.5', nextAction ? 'pb-3.5' : 'pb-[18px]')}>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className={cn('text-[13.5px] font-semibold leading-tight', mono ? 'font-mono' : 'tracking-tight', titleClass)}>{title}</span>
          <span className="text-xs text-muted-foreground">· {time}</span>
        </div>
        {sub && <div className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{sub}</div>}
        {isLearn && !!p.needs && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
            <Icon name="graduation-cap" size={13} /> {p.ticketId ? `Phiếu ${p.ticketId as string} · ` : ''}
            {(p.topic as string) ?? ''}
          </div>
        )}
        {detailVal != null && <JsonBlock value={detailVal} />}
      </div>
    </div>
  )
}

/* ---------- LayoutChat: transcript đầy đủ ---------- */
export function ConversationTimeline({ call, events, runningIndex }: {
  call: Conversation
  events: CallEvent[]
  runningIndex: number
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events.length])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-[780px] flex-col">
          {events.map((ev, i) => {
            if (isSpeechType(ev.type)) return <ChatBubble key={ev.id} ev={ev} time={relTime(events, i)} />
            if (ev.type === CallEventType.CallSummary) {
              return (
                <div key={ev.id} className="my-1.5 mb-3.5">
                  <SummaryCard call={call} compact />
                </div>
              )
            }
            return (
              <ActionRow
                key={ev.id}
                ev={ev}
                time={relTime(events, i)}
                running={i === runningIndex}
                prevAction={i > 0 && isActionType(events[i - 1].type)}
                nextAction={i < events.length - 1 && isActionType(events[i + 1].type)}
              />
            )
          })}
          {events.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">Chưa có sự kiện nào.</div>
          )}
        </div>
      </div>
    </div>
  )
}
