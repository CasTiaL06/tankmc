import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export type Kind = 'game' | 'mod' | 'pack' | 'update'
export interface Task { id: string; kind: Kind; title: string; state: 'active' | 'done' | 'error' | 'cancelled'; done: number; total: number; files: number; filesDone: number; speed: number; eta: number | null; startedAt: number; endedAt: number | null; error: string | null }
export interface Handle {
  readonly id: string; readonly signal: AbortSignal; readonly cancelled: boolean
  expect(bytes: number, files?: number): void; bytes(n: number): void; cached(n: number): void; fileDone(): void
  finish(title?: string): void; fail(msg: string): void
}
const WINDOW = 5000, KEEP = 30

// İndirme merkezi: aktif görevler (ilerleme, hız, kalan süre, iptal) ve tamamlanan/başarısız/iptal edilen geçmiş.
export class Downloads {
  private tasks: Task[] = []
  private ctl = new Map<string, AbortController>()
  private samples = new Map<string, [number, number][]>()
  private dir?: string
  private onChange: () => void
  private now: () => number
  constructor(dir?: string, onChange: () => void = () => {}, now: () => number = Date.now) {
    this.dir = dir; this.onChange = onChange; this.now = now
    if (dir) try {
      const r = JSON.parse(fs.readFileSync(path.join(dir, 'downloads.json'), 'utf8'))
      this.tasks = (Array.isArray(r) ? r : []).filter(t => t && typeof t.id === 'string' && ['game', 'mod', 'pack', 'update'].includes(t.kind)).slice(0, KEEP).map((t: any): Task => ({
        id: t.id, kind: t.kind, title: String(t.title ?? '').slice(0, 120), state: t.state === 'done' || t.state === 'cancelled' ? t.state : 'error',
        done: Number(t.done) || 0, total: Number(t.total) || 0, files: Number(t.files) || 0, filesDone: Number(t.filesDone) || 0, speed: 0, eta: null,
        startedAt: Number(t.startedAt) || 0, endedAt: Number(t.endedAt) || null, error: t.state === 'done' || t.state === 'cancelled' ? null : String(t.error ?? 'Uygulama kapandı').slice(0, 300) }))
    } catch { /* geçmiş yok */ }
  }
  list(): Task[] {
    const t = this.now()
    return this.tasks.map(x => {
      if (x.state !== 'active') return { ...x }
      const s = (this.samples.get(x.id) ?? []).filter(([ts]) => t - ts <= WINDOW), bytes = s.reduce((a, [, n]) => a + n, 0)
      const speed = bytes / Math.max(1000, Math.min(WINDOW, t - x.startedAt)) * 1000
      return { ...x, speed, eta: speed > 0 && x.total > x.done ? Math.ceil((x.total - x.done) / speed) : null }
    })
  }
  private save() {
    if (!this.dir) return
    try { fs.mkdirSync(this.dir, { recursive: true }); const f = path.join(this.dir, 'downloads.json'), tmp = f + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(this.tasks.filter(t => t.state !== 'active').slice(0, KEEP))); fs.renameSync(tmp, f) } catch { /* yazılamadı */ }
  }
  private end(task: Task, state: Task['state'], error: string | null) {
    task.state = state; task.error = error; task.endedAt = this.now(); this.ctl.delete(task.id); this.samples.delete(task.id)
    const old = this.tasks.filter(t => t.state !== 'active'); if (old.length > KEEP) this.tasks = this.tasks.filter(t => t.state === 'active' || old.indexOf(t) < KEEP)
    this.save(); this.onChange()
  }
  start(kind: Kind, title: string): Handle {
    const ctl = new AbortController(), self = this
    const task: Task = { id: crypto.randomUUID(), kind, title, state: 'active', done: 0, total: 0, files: 0, filesDone: 0, speed: 0, eta: null, startedAt: this.now(), endedAt: null, error: null }
    this.tasks.unshift(task); this.ctl.set(task.id, ctl); this.samples.set(task.id, []); this.onChange()
    const live = () => task.state === 'active'
    return {
      id: task.id, signal: ctl.signal, get cancelled() { return task.state === 'cancelled' },
      expect(b, f = 0) { if (live()) { task.total += Math.max(0, b); task.files += f; self.onChange() } },
      bytes(n) { if (!live()) return; if (n < 0) { task.done = Math.max(0, task.done + n); self.onChange(); return } task.done += n; const s = self.samples.get(task.id)!, t = self.now(); s.push([t, n]); while (s.length && t - s[0][0] > WINDOW) s.shift(); self.onChange() },
      cached(n) { if (live()) { task.done += n; task.filesDone++; self.onChange() } },
      fileDone() { if (live()) { task.filesDone++; self.onChange() } },
      finish(title) {
        if (!live()) return
        if (title) task.title = title.slice(0, 120)
        if (!task.files && !task.total && kind !== 'game') { self.tasks = self.tasks.filter(t => t !== task); self.ctl.delete(task.id); self.samples.delete(task.id); self.onChange(); return } // indirilecek bir şey yoktu
        self.end(task, 'done', null)
      },
      fail(msg) { if (live()) self.end(task, 'error', msg.slice(0, 300)) },
    }
  }
  cancel(id: string): boolean {
    const task = this.tasks.find(t => t.id === id)
    if (!task || task.state !== 'active') return false
    this.ctl.get(id)?.abort(); this.end(task, 'cancelled', null); return true
  }
  clear() { this.tasks = this.tasks.filter(t => t.state === 'active'); this.save(); this.onChange() }
}
