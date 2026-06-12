import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Icon } from '@/components/biva/icon'
import { cn } from '@/lib/utils'
import { CoordinationRow } from './coordination-row'
import { EventChip } from './event-chip'
import { SummaryCard } from './summary-card'
import {
  CAT_STYLE,
  catStyle,
  endReasonLabel,
  isResultFail,
  learnOverride,
  metaOf,
  payloadOf,
  relTime,
  resultNote,
  runningLabel,
  toolCallDetail,
  toolResultDetail,
} from '../lib/event-meta'
import { CallEventType, type CallEvent, type Conversation } from '@/types/call-events'

function isSpeechType(t: string) {
  return t === CallEventType.CustomerUtterance || t === CallEventType.BotUtterance
}
function isActionType(t: string) {
  return !isSpeechType(t) && t !== CallEventType.CallSummary
}

/* ---------- bong bóng lời nói (bot trái / khách phải) ---------- */
function ChatBubble({ isBot, text, time }: { isBot: boolean; text: string; time: string }) {
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
  const isLearn = ev.type === CallEventType.LearningChecked
  const fail =
    (isToolResult && isResultFail(ev)) ||
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
  if (isToolCall) detailVal = toolCallDetail(ev)
  else if (isToolResult) detailVal = toolResultDetail(ev)

  // Dòng phụ: tool_called dùng `note` (mô tả bot ghi nhận), tool_result dùng tóm tắt,
  // call.ended dịch `reason`, còn lại lấy reason/note/text.
  const sub = isToolCall
    ? ((p.args as Record<string, unknown> | undefined)?.note as string) ?? ''
    : isToolResult
      ? fail
        ? (p.error as string) ?? ''
        : resultNote(ev)
      : ev.type === CallEventType.CallEnded
        ? endReasonLabel(p.reason)
        : (p.reason as string) || (p.note as string) || (p.text as string) || ''

  // Sự kiện nhiều thông tin (có JSON detail) → cho phép thu gọn khi đã diễn ra xong.
  // Đang chạy thì luôn mở để theo dõi; xong rồi thì mặc định gập, bấm để mở lại.
  const collapsible = detailVal != null && !running
  const [open, setOpen] = useState(true)
  const showDetail = detailVal != null && (running || open)

  return (
    <div className="grid animate-in fade-in slide-in-from-bottom-1 grid-cols-[34px_1fr] gap-x-3 duration-300">
      <div className="flex flex-col items-center">
        <div className={cn('h-[7px] w-0.5', prevAction ? 'bg-border' : 'bg-transparent')} />
        <EventChip type={ev.type} size={28} overrideChip={overrideChip} overrideIcon={overrideIcon} spin={spin} />
        <div className={cn('min-h-2 w-0.5 flex-1', nextAction ? 'bg-border' : 'bg-transparent')} />
      </div>
      <div className={cn('min-w-0 pt-1.5', nextAction ? 'pb-3.5' : 'pb-[18px]')}>
        <div className="flex flex-wrap items-baseline gap-2">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="group inline-flex items-center gap-1.5 text-left"
              aria-expanded={open}
              title={open ? 'Thu gọn' : 'Xem chi tiết'}
            >
              <Icon
                name="chevron-right"
                size={14}
                className={cn('text-muted-foreground transition-transform group-hover:text-foreground', open && 'rotate-90')}
              />
              <span className={cn('text-[13.5px] font-semibold leading-tight', mono ? 'font-mono' : 'tracking-tight', titleClass)}>{title}</span>
            </button>
          ) : (
            <span className={cn('text-[13.5px] font-semibold leading-tight', mono ? 'font-mono' : 'tracking-tight', titleClass)}>{title}</span>
          )}
          <span className="text-xs text-muted-foreground">· {time}</span>
        </div>
        {sub && <div className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{sub}</div>}
        {isLearn && !!p.needs && (
          p.ticketId ? (
            <Link
              to="/learn/$id"
              params={{ id: p.ticketId as string }}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 no-underline transition-colors hover:border-orange-300 hover:bg-orange-100"
              title="Mở phiếu học"
            >
              <Icon name="graduation-cap" size={13} /> {`Phiếu ${p.ticketId as string} · `}
              {(p.title as string) ?? ''}
              <Icon name="chevron-right" size={13} className="opacity-60" />
            </Link>
          ) : (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
              <Icon name="graduation-cap" size={13} /> {(p.title as string) ?? ''}
            </div>
          )
        )}
        {showDetail && <JsonBlock value={detailVal} />}
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

  // Dựng danh sách node hiển thị:
  //  • bot.thinking đã xong → ẩn hẳn (chỉ giữ event đang chạy).
  //  • Gộp các TTS segment LIỀN NHAU của BOT thành MỘT bong bóng: một lượt nói thật của
  //    bot thường bị nền tảng cắt thành nhiều `bot.utterance` ngắn liên tiếp
  //    ("...8 giờ, 9 giờ 30, 13 giờ," | "14 giờ 30, nhiều chuyến tối nữa anh ạ." | "Anh
  //    muốn đi chuyến mấy giờ…") → nối lại để không hiện câu cụt. Chỉ gộp khi hai mảnh
  //    nằm SÁT nhau trong dòng đã sort: bất kỳ event khác (lời khách, tool, hold, điều
  //    phối…) xen giữa đều ngắt lượt, nên KHÔNG nhập nhằng nối hai lượt rời thành câu
  //    chạy (vd hai câu chờ quanh một lần hold). Lời KHÁCH (ASR final) giữ tách từng câu.
  type SpeechNode = { kind: 'speech'; isBot: boolean; text: string; i: number; key: string }
  type EventNode = { kind: 'event'; ev: CallEvent; i: number }
  const nodes: Array<SpeechNode | EventNode> = []
  events.forEach((ev, i) => {
    if (ev.type === CallEventType.BotThinking && i !== runningIndex) return
    if (isSpeechType(ev.type)) {
      const isBot = ev.type === CallEventType.BotUtterance
      const text = ((payloadOf(ev).text as string) ?? '').trim()
      if (!text) return
      const prev = nodes[nodes.length - 1]
      if (isBot && prev && prev.kind === 'speech' && prev.isBot) {
        // 'replace' = bản chốt của lượt → ĐÈ text đã gom (tránh nối đôi thành câu chạy
        // như "...hỏi quản lý giúp Dạ em đang hỏi nhân viên..."); 'append'/không có =
        // nối tiếp mảnh TTS vào cùng bong bóng.
        prev.text = payloadOf(ev).mode === 'replace' ? text : `${prev.text} ${text}`
        return
      }
      nodes.push({ kind: 'speech', isBot, text, i, key: ev.id })
      return
    }
    nodes.push({ kind: 'event', ev, i })
  })

  const isActionNode = (n: SpeechNode | EventNode | undefined) =>
    !!n && n.kind === 'event' && isActionType(n.ev.type)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-[780px] flex-col">
          {nodes.map((n, ni) => {
            if (n.kind === 'speech') {
              return <ChatBubble key={n.key} isBot={n.isBot} text={n.text} time={relTime(events, n.i)} />
            }
            const { ev, i } = n
            if (ev.type === CallEventType.CallSummary) {
              return (
                <div key={ev.id} className="my-1.5 mb-3.5">
                  <SummaryCard call={call} compact summary={ev.payload} />
                </div>
              )
            }
            if (
              ev.type === CallEventType.CoordinationCalled ||
              ev.type === CallEventType.CoordinationResult
            ) {
              return (
                <CoordinationRow
                  key={ev.id}
                  ev={ev}
                  time={relTime(events, i)}
                  running={i === runningIndex}
                  prevAction={isActionNode(nodes[ni - 1])}
                  nextAction={isActionNode(nodes[ni + 1])}
                />
              )
            }
            return (
              <ActionRow
                key={ev.id}
                ev={ev}
                time={relTime(events, i)}
                running={i === runningIndex}
                prevAction={isActionNode(nodes[ni - 1])}
                nextAction={isActionNode(nodes[ni + 1])}
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
