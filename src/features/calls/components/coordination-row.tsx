import { Icon } from '@/components/biva/icon'
import { cn } from '@/lib/utils'
import { coordAnswer, isCoordUnanswered, payloadOf } from '../lib/event-meta'
import { CallEventType, type CallEvent } from '@/types/call-events'

/** Logo Zalo (đặt ở public/). */
const ZALO_LOGO = '/zalo.webp'
/** Xanh thương hiệu Zalo. */
const ZALO_BLUE = '#0068ff'

/**
 * Một bước điều phối qua nhóm Zalo — hiển thị đơn giản, canh trái như các hành động
 * khác trên rail (cột icon + tiêu đề + nội dung), KHÔNG dùng bong bóng chat để tránh
 * lẫn với lời khách/bot.
 *  • coordination.called → bot gửi câu hỏi vào nhóm Zalo (hiện câu hỏi).
 *  • coordination.result → nhân viên trả lời (hiện câu trả lời đã bỏ @mention); nếu
 *    answered=false thì báo chưa nhận được phản hồi.
 */
export function CoordinationRow({
  ev,
  time,
  running,
  prevAction,
  nextAction,
}: {
  ev: CallEvent
  time: string
  running: boolean
  prevAction: boolean
  nextAction: boolean
}) {
  const p = payloadOf(ev)
  const isCalled = ev.type === CallEventType.CoordinationCalled
  const unanswered = !isCalled && isCoordUnanswered(ev)

  return (
    <div className="grid animate-in fade-in slide-in-from-bottom-1 grid-cols-[34px_1fr] gap-x-3 duration-300">
      {/* rail icon = logo Zalo */}
      <div className="flex flex-col items-center">
        <div className={cn('h-[7px] w-0.5', prevAction ? 'bg-border' : 'bg-transparent')} />
        <span
          className="inline-flex size-7 items-center justify-center overflow-hidden rounded-md border bg-white"
          style={{ borderColor: '#cfe1ff' }}
        >
          <img src={ZALO_LOGO} alt="Zalo" className="size-[18px] object-contain" />
        </span>
        <div className={cn('min-h-2 w-0.5 flex-1', nextAction ? 'bg-border' : 'bg-transparent')} />
      </div>

      {/* thân */}
      <div className={cn('min-w-0 pt-1.5', nextAction ? 'pb-3.5' : 'pb-[18px]')}>
        <div className="flex flex-wrap items-center gap-2">
          {/* mũi tên hướng: ra (gửi đi Zalo) / vào (nhận phản hồi về) */}
          <span
            className="inline-flex items-center"
            style={{ color: isCalled ? ZALO_BLUE : unanswered ? '#b45309' : '#16a34a' }}
            title={isCalled ? 'Gửi câu hỏi ra nhóm Zalo' : 'Nhận phản hồi từ nhóm Zalo'}
          >
            <Icon name={isCalled ? 'arrow-up-right' : 'arrow-down-left'} size={15} />
          </span>
          <span className="text-[13.5px] font-semibold leading-tight tracking-tight" style={{ color: ZALO_BLUE }}>
            {isCalled ? 'Điều phối qua Zalo' : 'Phản hồi từ Zalo'}
          </span>
          <span className="text-xs text-muted-foreground">· {time}</span>
          {isCalled && running && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: ZALO_BLUE }}>
              <span className="size-1.5 animate-pulse rounded-full" style={{ background: ZALO_BLUE }} />
              Đang chờ phản hồi…
            </span>
          )}
        </div>

        {isCalled ? (
          !!(p.question as string) && (
            <div className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{p.question as string}</div>
          )
        ) : unanswered ? (
          <div className="mt-0.5 text-[13px] leading-relaxed text-amber-700">Chưa nhận được phản hồi từ nhóm Zalo.</div>
        ) : (
          <div className="mt-0.5 text-[13px] leading-relaxed text-foreground">{coordAnswer(ev)}</div>
        )}
      </div>
    </div>
  )
}
