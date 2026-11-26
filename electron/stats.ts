import fs from 'fs'
import path from 'path'

export interface Session { start: number; end: number; label: string; version: string }
export interface Summary { totalMs: number; count: number; recent: Session[]; top: { label: string; ms: number } | null }
const file = (dir: string) => path.join(dir, 'playtime.json')
const WEEK = 7 * 24 * 3600e3

// Yalnızca TankClient'in kendi başlattığı oyun oturumları kaydedilir; uydurma veri yoktur.
export function loadSessions(dir: string): Session[] {
  try {
    const r = JSON.parse(fs.readFileSync(file(dir), 'utf8'))
    return (Array.isArray(r) ? r : []).filter(s => s && Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start && s.end - s.start < WEEK)
      .map((s: any) => ({ start: s.start, end: s.end, label: String(s.label ?? '').slice(0, 80), version: String(s.version ?? '').slice(0, 40) })).slice(-1000)
  } catch { return [] }
}
export function record(dir: string, s: Session) {
  if (!(s.end > s.start) || s.end - s.start < 5000) return // 5 sn'den kısa (açılış çökmesi) sayılmaz
  const l = [...loadSessions(dir), s].slice(-1000)
  fs.mkdirSync(dir, { recursive: true }); const t = file(dir) + '.tmp'
  fs.writeFileSync(t, JSON.stringify(l)); fs.renameSync(t, file(dir))
}
export function summarize(l: Session[]): Summary {
  const by = new Map<string, number>(); let total = 0
  for (const s of l) { const d = s.end - s.start; total += d; by.set(s.label, (by.get(s.label) ?? 0) + d) }
  const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0]
  return { totalMs: total, count: l.length, recent: l.slice(-10).reverse(), top: top ? { label: top[0], ms: top[1] } : null }
}
