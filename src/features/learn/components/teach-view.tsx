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
import { teachLearningItem } from '../api'
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

export function TeachView({ item, onBack }: { item: LearningItem; onBack: () => void }) {
  const qc = useQueryClient()
  const [answer, setAnswer] = useState(item.answer ?? '')
  const [when, setWhen] = useState('')
  const [intent, setIntent] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(item.status === 'taught')
  const [submitting, setSubmitting] = useState(false)
  const link = `biva.ai/teach/${item.id.toLowerCase()}`

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
      setSaved(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[980px] px-7 pt-5 pb-12">
        <Button variant="ghost" onClick={onBack} className="mb-3.5 -ml-2">
          <Icon name="arrow-left" size={16} /> Tất cả điểm cần học
        </Button>

        {/* share banner */}
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
                <Button size="sm" variant="outline">
                  <Icon name="play" size={13} /> Nghe lại
                </Button>
              </div>
            </Card>
          </div>

          {/* phải: form dạy */}
          <div>
            {saved ? (
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
                <Button variant="outline" className="mt-4 self-center" onClick={() => setSaved(false)}>
                  <Icon name="pencil" size={14} /> Chỉnh sửa câu trả lời
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
                  <Button onClick={submit} disabled={!answer.trim() || submitting} className="flex-1">
                    <Icon name="graduation-cap" size={15} /> {submitting ? 'Đang lưu…' : 'Dạy bot'}
                  </Button>
                  <Button variant="outline" onClick={onBack}>
                    Để sau
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
