import { useRef, type RefObject } from 'react'
import { Icon } from '@/components/biva/icon'
import { cn } from '@/lib/utils'
import { fmtDuration } from '../lib/format'
import type { AudioControls } from '../lib/use-audio-playback'

/** Trình phát ghi âm: phát file thật (khi có audioUrl), đầu phát kéo tua được, transcript bám theo. */
export function AudioPlayer({
  controls,
  audioUrl,
  audioRef,
}: {
  controls: AudioControls
  audioUrl?: string
  audioRef?: RefObject<HTMLAudioElement | null>
}) {
  const { t, total, playing, rate } = controls
  const barRef = useRef<HTMLDivElement>(null)
  const pct = total ? Math.max(0, Math.min(100, (t / total) * 100)) : 0

  const seekAt = (clientX: number) => {
    const el = barRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    controls.seek(frac * total)
  }
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault()
    seekAt(e.clientX)
    const move = (ev: PointerEvent) => seekAt(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="flex w-full items-center gap-4">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />}
      <button
        onClick={controls.toggle}
        title={playing ? 'Tạm dừng' : 'Phát ghi âm'}
        className="inline-flex size-[42px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <Icon name={playing ? 'pause' : 'play'} size={19} className={playing ? '' : 'ml-0.5'} />
      </button>

      <span className="min-w-[38px] font-mono text-[13px] text-foreground">{fmtDuration(t)}</span>

      <div ref={barRef} onPointerDown={onDown} className="relative flex h-7 flex-1 cursor-pointer items-center touch-none">
        <div className="absolute inset-x-0 h-[5px] rounded-full bg-secondary" />
        <div className="absolute left-0 h-[5px] rounded-full bg-primary" style={{ width: `${pct}%` }} />
        <div
          className="absolute size-3.5 -translate-x-1/2 rounded-full border-2 border-primary bg-background shadow-sm"
          style={{ left: `${pct}%` }}
        />
      </div>

      <span className="min-w-[38px] font-mono text-[13px] text-muted-foreground">{fmtDuration(total)}</span>

      <div className="inline-flex gap-0.5 rounded-md bg-muted p-0.5">
        {[1, 1.5, 2].map((r) => (
          <button
            key={r}
            onClick={() => controls.setRate(r)}
            className={cn(
              'cursor-pointer rounded-sm px-2.5 py-1 text-xs font-semibold',
              rate === r ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {r}×
          </button>
        ))}
      </div>

      {audioUrl && (
        <a
          href={audioUrl}
          target="_blank"
          rel="noreferrer"
          title="Mở file ghi âm gốc"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground no-underline"
        >
          <Icon name="download" size={15} />
        </a>
      )}
    </div>
  )
}
