/** "m:ss" từ số giây. */
export function fmtDuration(sec?: number | null): string {
  if (sec == null) return '—'
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "Hôm nay · 14:32" / "Hôm qua · 14:32" / "06/06 · 14:32". */
export function fmtStartedAt(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86400000)
  if (dayDiff === 0) return `Hôm nay · ${hhmm(d)}`
  if (dayDiff === 1) return `Hôm qua · ${hhmm(d)}`
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} · ${hhmm(d)}`
}

/** Chữ cái đầu để làm avatar. */
export function initialsOf(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[parts.length - 1]?.[0] ?? '?').toUpperCase()
}
