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
 *
 * Khi có `audioUrl`: phát FILE GHI ÂM THẬT — `t`, play/pause, tua, tốc độ đều bám theo
 * thẻ `<audio>` (gắn ở AudioPlayer qua `audioRef`). Không có URL thì mô phỏng bằng rAF.
 */
export function useAudioPlayback(
  events: CallEvent[],
  durationSec: number,
  audioUrl?: string,
) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioDur, setAudioDur] = useState(0)
  // Thời lượng: ưu tiên độ dài thật của file ghi âm khi đã nạp được metadata.
  const total = (audioUrl && audioDur > 0 ? audioDur : durationSec) || 0

  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRateState] = useState(1)
  const raf = useRef(0)
  const prev = useRef(0)

  // Mặc định đặt đầu phát ở CUỐI → transcript hiển thị đầy đủ ngay khi mở.
  // Bấm Play (toggle khi t>=total) sẽ tua về đầu và phát lại từ đầu.
  useEffect(() => {
    setT(total)
    setPlaying(false)
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
  }, [events, total])

  // Đồng bộ với thẻ <audio> thật: đọc thời lượng, dừng khi hết file.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !audioUrl) return
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setAudioDur(a.duration)
    }
    const onEnded = () => {
      setPlaying(false)
      setT(a.duration || 0)
    }
    a.playbackRate = rate
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnded)
    onMeta()
    return () => {
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnded)
    }
  }, [audioUrl, rate])

  // Phát/dừng thẻ <audio> theo state `playing`.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !audioUrl) return
    if (playing) void a.play().catch(() => setPlaying(false))
    else a.pause()
  }, [playing, audioUrl])

  // Vòng lặp cập nhật đầu phát: bám currentTime của file thật, hoặc cộng dồn khi mô phỏng.
  useEffect(() => {
    if (!playing) return
    prev.current = performance.now()
    const tick = (now: number) => {
      const a = audioRef.current
      if (audioUrl && a) {
        setT(a.currentTime)
      } else {
        const dt = (now - prev.current) / 1000
        setT((x) => Math.min(total, x + dt * rate))
      }
      prev.current = now
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, rate, total, audioUrl])

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
          const a = audioRef.current
          if (a) a.currentTime = 0
        }
        return !p
      }),
    seek: (v) => {
      const nv = Math.max(0, Math.min(total, v))
      setT(nv)
      const a = audioRef.current
      if (a) a.currentTime = nv
    },
    setRate: (r) => {
      setRateState(r)
      const a = audioRef.current
      if (a) a.playbackRate = r
    },
  }
  return { count, controls, audioRef }
}
