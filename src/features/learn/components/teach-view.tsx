import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@/components/biva/icon'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { EventChip } from '@/features/calls/components/event-chip'
import { CAT_STYLE } from '@/features/calls/lib/event-meta'
import { fmtStartedAt, initialsOf } from '@/features/calls/lib/format'
import { dismissLearningItem, teachLearningItem } from '../api'
import { KIND_META } from './learn-card'
import type { LearningItem } from '@/types/call-events'

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="mb-3.5">
      <Label className="mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}

/** Kết quả đã chốt của phiếu: chưa xử lý / đã dạy / không cần dạy. */
type Result = 'none' | 'taught' | 'dismissed'

function initialResult(status: LearningItem['status']): Result {
  if (status === 'taught') return 'taught'
  if (status === 'dismissed') return 'dismissed'
  return 'none'
}

/**
 * Form dạy bot cho một phiếu học.
 * - variant "internal": dùng trong app (có nút về danh sách + banner chia sẻ link).
 * - variant "public": trang chia sẻ /teach/:id cho chuyên viên không có tài khoản
 *   (ẩn điều hướng nội bộ, hiện header logo).
 */
export function TeachView({
  item,
  onBack,
  variant = 'internal',
}: {
  item: LearningItem
  onBack?: () => void
  variant?: 'internal' | 'public'
}) {
  const qc = useQueryClient()
  const [answer, setAnswer] = useState(item.answer ?? '')
  const [when, setWhen] = useState('')
  const [intent, setIntent] = useState('')
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<Result>(initialResult(item.status))
  const [submitting, setSubmitting] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const link = `biva.ai/teach/${item.id.toLowerCase()}`
  const isPublic = variant === 'public'

  const copy = () => {
    try {
      void navigator.clipboard?.writeText('https://' + link)
    } catch {
      /* ignore */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  const submit = async () => {
    if (!answer.trim()) return
    setSubmitting(true)
    try {
      await teachLearningItem(item.id, { answer, when, intent })
      await qc.invalidateQueries({ queryKey: ['learning'] })
      setResult('taught')
    } finally {
      setSubmitting(false)
    }
  }
  const dismiss = async () => {
    setDismissing(true)
    try {
      await dismissLearningItem(item.id)
      await qc.invalidateQueries({ queryKey: ['learning'] })
      setResult('dismissed')
    } finally {
      setDismissing(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[980px] px-7 pt-5 pb-12">
        {isPublic ? (
          /* header trang chia sẻ công khai */
          <div className="mb-5 flex items-center gap-3">
            <img src="/logo_biva.png" alt="Biva" className="block h-[26px] w-auto" />
            <div className="border-l pl-3 text-[13px] text-muted-foreground">
              Giúp trợ lý AI trả lời tốt hơn — điền câu trả lời chuẩn theo nghiệp vụ.
            </div>
          </div>
        ) : (
          <Button variant="ghost" onClick={onBack} className="mb-3.5 -ml-2">
            <Icon name="arrow-left" size={16} /> Tất cả điểm cần học
          </Button>
        )}

        {/* banner chia sẻ link — chỉ hiện trong app */}
        {!isPublic && (
          <div className="mb-5 flex items-center gap-3.5 rounded-xl bg-primary px-4 py-3.5 text-primary-foreground">
            <span className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-primary-foreground/15">
              <Icon name="link" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Chia sẻ để chuyên viên nghiệp vụ điền giúp</div>
              <div className="text-xs opacity-75">Ai có link này đều có thể bổ sung câu trả lời chuẩn — không cần tài khoản.</div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 py-1.5 pr-1.5 pl-3">
              <code className="font-mono text-[13px]">{link}</code>
              <button
                onClick={copy}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary-foreground px-2.5 py-1.5 text-xs font-semibold text-primary"
              >
                <Icon name={copied ? 'check' : 'copy'} size={13} /> {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-[22px]">
          {/* trái: ngữ cảnh */}
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <EventChip type="learning.checked" size={30} overrideChip={CAT_STYLE.learn.chip} overrideIcon="graduation-cap" />
              <div>
                <div className="text-base font-semibold tracking-tight">{item.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {KIND_META[item.kind].label} · gặp {item.count} lần
                </div>
              </div>
            </div>

            <Card className="gap-0 p-4">
              <div className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Khách đã hỏi</div>
              <div className="rounded-lg border-l-[3px] border-border bg-muted/50 px-3 py-2.5 text-sm italic leading-relaxed">
                {item.question}
              </div>
              {item.note && <div className="mt-3.5 text-[13.5px] leading-relaxed text-muted-foreground">{item.note}</div>}
              <Separator className="my-3.5" />
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8">
                  <AvatarFallback>{initialsOf(item.callName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{item.callName}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {item.conversationId} · {fmtStartedAt(item.occurredAt)}
                  </div>
                </div>
                {!isPublic && (
                  <Button size="sm" variant="outline">
                    <Icon name="play" size={13} /> Nghe lại
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* phải: form dạy */}
          <div>
            {result === 'taught' ? (
              <Card className="gap-0 p-6 text-center">
                <span className="mx-auto inline-flex size-[52px] items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-600">
                  <Icon name="check" size={26} />
                </span>
                <div className="mt-3.5 text-base font-semibold">Đã dạy bot thành công</div>
                <div className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  Bot sẽ áp dụng câu trả lời này từ cuộc gọi tiếp theo. Hệ thống sẽ theo dõi độ chính xác và báo lại nếu cần
                  tinh chỉnh.
                </div>
                <div className="mt-4 rounded-[10px] border bg-muted/50 p-3.5 text-left">
                  <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Bot sẽ trả lời</div>
                  <div className="flex items-start gap-2.5">
                    <span className="inline-flex size-[26px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Icon name="bot" size={14} />
                    </span>
                    <div className="text-[13.5px] leading-relaxed">{answer}</div>
                  </div>
                </div>
                <Button variant="outline" className="mt-4 self-center" onClick={() => setResult('none')}>
                  <Icon name="pencil" size={14} /> Chỉnh sửa câu trả lời
                </Button>
              </Card>
            ) : result === 'dismissed' ? (
              <Card className="gap-0 p-6 text-center">
                <span className="mx-auto inline-flex size-[52px] items-center justify-center rounded-full border bg-muted text-muted-foreground">
                  <Icon name="check" size={26} />
                </span>
                <div className="mt-3.5 text-base font-semibold">Đã đánh dấu không cần dạy</div>
                <div className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  Phiếu này đã hoàn thành — bot không cần học thêm từ tình huống trên. Nếu đổi ý, bạn vẫn có thể dạy bot.
                </div>
                <Button variant="outline" className="mt-4 self-center" onClick={() => setResult('none')}>
                  <Icon name="graduation-cap" size={14} /> Tôi vẫn muốn dạy bot
                </Button>
              </Card>
            ) : (
              <Card className="gap-0 p-[18px]">
                <div className="mb-1 text-[15px] font-semibold">Hướng dẫn bot trả lời</div>
                <div className="mb-4 text-[13px] text-muted-foreground">
                  Điền câu trả lời chuẩn theo nghiệp vụ. Bot sẽ diễn đạt lại bằng giọng tự nhiên.
                </div>
                <Field label="Câu trả lời chuẩn" required>
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={4}
                    placeholder="Ví dụ: Xe có nhận chở xe đạp gấp nếu gấp gọn, phụ thu 30.000đ/xe…"
                  />
                </Field>
                <Field label="Khi nào áp dụng (tuỳ chọn)">
                  <Textarea
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    rows={2}
                    placeholder="Ví dụ: Chỉ áp dụng cho xe giường nằm, tuyến đường dài…"
                  />
                </Field>
                <Field label="Gắn vào ý định (tuỳ chọn)">
                  <Input value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="vd: hoi_chinh_sach_hanh_ly" />
                </Field>
                <div className="mt-[18px] flex gap-2.5">
                  <Button onClick={submit} disabled={!answer.trim() || submitting || dismissing} className="flex-1">
                    <Icon name="graduation-cap" size={15} /> {submitting ? 'Đang lưu…' : 'Dạy bot'}
                  </Button>
                  <Button variant="outline" onClick={dismiss} disabled={submitting || dismissing}>
                    {dismissing ? 'Đang lưu…' : 'Không cần dạy'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
