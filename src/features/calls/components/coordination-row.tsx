import { Icon } from '@/components/biva/icon'
import { cn } from '@/lib/utils'
import { coordAnswer, isCoordUnanswered, payloadOf } from '../lib/event-meta'
import { CallEventType, type CallEvent } from '@/types/call-events'

/** Logo Zalo (đặt ở public/). */
const ZALO_LOGO = '/zalo.webp'
/** Xanh thương hiệu Zalo. */
const ZALO_BLUE = '#0068ff'

/**
 * Một bước điều phối qua nhóm Zalo (giữ nguyên cấu trúc rail cột-icon như ActionRow):
 *  • coordination.called → bot gửi câu hỏi vào nhóm Zalo (bong bóng "đi", bên phải).
 *  • coordination.result → nhân viên trả lời (bong bóng "nhận", bên trái) đã bỏ @mention;
 *    nếu chưa có ai trả lời (answered=false) thì hiện trạng thái chờ/hết giờ.
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

      {/* thân = thẻ chat kiểu Zalo */}
      <div className={cn('min-w-0 pt-1.5', nextAction ? 'pb-3.5' : 'pb-[18px]')}>
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: '#dbe8ff', background: '#f5f9ff' }}>
          {/* header có logo + nhãn Zalo */}
          <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: '#e3edff' }}>
            <img src={ZALO_LOGO} alt="" className="size-[18px] object-contain" />
            <span className="text-[12.5px] font-semibold" style={{ color: ZALO_BLUE }}>
              {isCalled ? 'Điều phối qua nhóm Zalo' : 'Phản hồi từ nhóm Zalo'}
            </span>
            <span className="text-xs text-muted-foreground">· {time}</span>
            {isCalled && running && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: ZALO_BLUE }}>
                <span className="size-1.5 animate-pulse rounded-full" style={{ background: ZALO_BLUE }} />
                Đang chờ phản hồi…
              </span>
            )}
          </div>

          {/* body: bong bóng câu hỏi (đi) / câu trả lời (nhận) / trạng thái chờ */}
          <div className="px-3 py-2.5">
            {isCalled ? (
              <div className="flex justify-end">
                <div
                  className="max-w-[88%] rounded-2xl rounded-br-[5px] px-3 py-2 text-[13px] leading-relaxed text-white"
                  style={{ background: ZALO_BLUE }}
                >
                  {(p.question as string) ?? ''}
                </div>
              </div>
            ) : unanswered ? (
              <div className="inline-flex items-center gap-1.5 text-[13px] text-amber-700">
                <Icon name="triangle-alert" size={14} /> Chưa nhận được phản hồi từ nhóm.
              </div>
            ) : (
              <div className="flex flex-col items-start gap-1">
                <div className="max-w-[88%] rounded-2xl rounded-bl-[5px] border border-slate-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-foreground">
                  {coordAnswer(ev)}
                </div>
                <span className="inline-flex items-center gap-1 pl-1 text-[11px] font-medium text-green-600">
                  <Icon name="check-check" size={12} /> Đã ghi nhận trả lời
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
