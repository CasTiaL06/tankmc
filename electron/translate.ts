import fs from 'fs'
import path from 'path'

// Ücretsiz çeviri (MyMemory) için önbellekli, günlük sınırlı çevirici. Sınır dolarsa veya hata olursa özgün metin kalır.
export interface TrResult { text?: string; quota?: boolean }
export type TrFetch = (text: string) => Promise<TrResult>
const DAILY = 4500, MAXLEN = 450, KEEP = 4000

export function createTranslator(dir: string, call: TrFetch, now: () => number = Date.now) {
  const file = path.join(dir, 'translations.json')
  let db: { map: Record<string, string>; day: string; used: number; blocked: number } = { map: {}, day: '', used: 0, blocked: 0 }
  try { const r = JSON.parse(fs.readFileSync(file, 'utf8')); if (r && typeof r.map === 'object' && r.map) db = { map: r.map, day: String(r.day ?? ''), used: Number(r.used) || 0, blocked: Number(r.blocked) || 0 } } catch { /* ilk kullanım */ }
  let timer: ReturnType<typeof setTimeout> | null = null
  const save = () => {
    if (timer) return
    timer = setTimeout(() => { timer = null; try {
      const keys = Object.keys(db.map); for (const k of keys.slice(0, Math.max(0, keys.length - KEEP))) delete db.map[k]
      fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file + '.tmp', JSON.stringify(db)); fs.renameSync(file + '.tmp', file) } catch { /* yazılamadı */ } }, 400)
  }
  const day = () => new Date(now()).toISOString().slice(0, 10)
  let active = 0; const waiters: (() => void)[] = []
  const slot = async () => { if (active >= 4) await new Promise<void>(r => waiters.push(r)); active++ }
  const free = () => { active--; waiters.shift()?.() }
  const pending = new Map<string, Promise<string | null>>()
  function one(t: string): Promise<string | null> {
    if (Object.prototype.hasOwnProperty.call(db.map, t)) return Promise.resolve(db.map[t])
    if (t.length < 3 || t.length > MAXLEN || !/\p{L}/u.test(t)) return Promise.resolve(null)
    if (db.day !== day()) { db.day = day(); db.used = 0 }
    if (now() < db.blocked || db.used + t.length > DAILY) return Promise.resolve(null)
    let p = pending.get(t)
    if (!p) {
      db.used += t.length
      p = (async () => {
        await slot()
        try {
          const r = await call(t)
          if (r.quota) { db.blocked = now() + 6 * 3600e3; save(); return null }
          const x = r.text?.trim()
          if (x && x !== t) { db.map[t] = x; save(); return x }
          return null
        } catch { return null } finally { free(); pending.delete(t) }
      })()
      pending.set(t, p)
    }
    return p
  }
  return {
    // En fazla ms bekler; yetişemeyenler arka planda önbelleğe yazılır (bir sonraki görüntülemede Türkçe olur)
    async many(texts: string[], ms = 4000): Promise<Map<string, string>> {
      const out = new Map<string, string>()
      const jobs = [...new Set(texts)].map(async t => { const r = await one(t); if (r) out.set(t, r) })
      let to: ReturnType<typeof setTimeout> | undefined
      await Promise.race([Promise.all(jobs), new Promise<void>(r => { to = setTimeout(r, ms) })]); clearTimeout(to)
      return new Map(out)
    },
    status: () => ({ blocked: now() < db.blocked, used: db.used }),
  }
}
