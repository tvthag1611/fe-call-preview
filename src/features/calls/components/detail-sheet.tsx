import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { CallDetail } from './call-detail'

/** Panel chi tiết trượt từ phải, đè lên danh sách (Esc / click nền / ✕ để đóng). */
export function DetailSheet({ conversationId, onClose, onOpenLearn }: {
  conversationId: string
  onClose: () => void
  onOpenLearn: () => void
}) {
  const [closing, setClosing] = useState(false)
  const close = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 230)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing])

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={close}
        className={cn(
          'absolute inset-0 bg-black/45 backdrop-blur-[1px]',
          closing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200',
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute inset-y-0 right-0 flex h-full w-[min(880px,94vw)] min-h-0 flex-col border-l bg-card shadow-2xl',
          closing ? 'animate-out slide-out-to-right duration-200' : 'animate-in slide-in-from-right duration-300',
        )}
      >
        <CallDetail conversationId={conversationId} onClose={close} onOpenLearn={onOpenLearn} />
      </div>
    </div>
  )
}
