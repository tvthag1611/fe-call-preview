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

  const [t, setT] = useState(Number.POSITIVE_INFINITY)
  const [playing, setPlaying] = useState(false)
  const [rate, setRateState] = useState(1)
  const raf = useRef(0)
  const prev = useRef(0)

  // Đầu phát hiệu dụng: ∞ (mặc định/khi hết file) → kẹp về CUỐI `total` để transcript
  // hiển thị đầy đủ; giá trị hữu hạn thì kẹp trong [0, total].
  const tEff = Number.isFinite(t) ? Math.min(Math.max(0, t), total) : total

  // Reset CHỈ khi đổi cuộc gọi (events). KHÔNG phụ thuộc `total` — vì `total` đổi lúc
  // metadata audio nạp xong; reset ở đó sẽ pause + tua-0 NGAY SAU khi bấm Play (tịt tiếng).
  useEffect(() => {
    setPlaying(false)
    setT(Number.POSITIVE_INFINITY)
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
  }, [events])

  // Đồng bộ với thẻ <audio> thật: đọc thời lượng, dừng khi hết file.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !audioUrl) return
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setAudioDur(a.duration)
    }
    const onEnded = () => {
      setPlaying(false)
      setT(Number.POSITIVE_INFINITY)
    }
    const onError = () => {
      setPlaying(false)
      console.warn('[audio] không tải/phát được ghi âm:', audioUrl, a.error)
    }
    a.playbackRate = rate
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnded)
    a.addEventListener('error', onError)
    onMeta()
    return () => {
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnded)
      a.removeEventListener('error', onError)
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
        setT((x) => Math.min(total, (Number.isFinite(x) ? x : 0) + dt * rate))
      }
      prev.current = now
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, rate, total, audioUrl])

  useEffect(() => {
    if (playing && total > 0 && Number.isFinite(t) && t >= total) setPlaying(false)
  }, [t, total, playing])

  // Lộ dần transcript theo đầu phát. Đồng hồ AUDIO (0→độ dài file) khác đồng hồ SỰ KIỆN
  // (0→mốc event cuối) — vì summary/ended sinh ra ở/sau lúc kết thúc ghi âm, mốc của chúng
  // có thể vượt quá độ dài audio. Ánh xạ tỉ lệ đầu phát sang đồng hồ sự kiện để khi tua tới
  // cuối (hoặc lúc mở, t=total) MỌI event — gồm cả card summary — đều hiện.
  const times = eventTimes(events)
  const eventTotal = times.length ? times[times.length - 1] : 0
  const revealT = total > 0 ? (tEff / total) * eventTotal : eventTotal
  const count = times.filter((x) => x <= revealT + 1e-3).length

  const controls: AudioControls = {
    playing,
    rate,
    t: tEff,
    total,
    toggle: () =>
      setPlaying((p) => {
        // Đang ở cuối → bấm Play sẽ phát lại từ đầu.
        if (!p && tEff >= total - 0.05) {
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
