import { useEffect, useRef, useState } from 'react'
import type { CallEvent } from '@/types/call-events'
import { eventTimes } from './event-meta'

export interface AudioControls {
  playing: boolean
  rate: number
  t: number
  total: number
  toggle: () => void
  seek: (v: number) => void
  setRate: (r: number) => void
}

/**
 * Mô hình trình phát ghi âm: đầu phát `t` (giây) chạy theo thời gian thực; transcript
 * lộ dần các event có mốc thời gian ≤ t. Kéo tua được. `total` = thời lượng cuộc gọi.
 */
export function useAudioPlayback(events: CallEvent[], durationSec: number) {
  const total = durationSec || 0
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const raf = useRef(0)
  const prev = useRef(0)

  // Mặc định đặt đầu phát ở CUỐI → transcript hiển thị đầy đủ ngay khi mở.
  // Bấm Play (toggle khi t>=total) sẽ tua về đầu và phát lại từ đầu.
  useEffect(() => {
    setT(total)
    setPlaying(false)
  }, [events, total])

  useEffect(() => {
    if (!playing) return
    prev.current = performance.now()
    const tick = (now: number) => {
      const dt = (now - prev.current) / 1000
      prev.current = now
      setT((x) => Math.min(total, x + dt * rate))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, rate, total])

  useEffect(() => {
    if (playing && total > 0 && t >= total) setPlaying(false)
  }, [t, total, playing])

  const times = eventTimes(events)
  const count = times.filter((x) => x <= t + 1e-3).length

  const controls: AudioControls = {
    playing,
    rate,
    t,
    total,
    toggle: () =>
      setPlaying((p) => {
        if (!p && t >= total) {
          setT(0)
          return true
        }
        return !p
      }),
    seek: (v) => setT(Math.max(0, Math.min(total, v))),
    setRate,
  }
  return { count, controls }
}
