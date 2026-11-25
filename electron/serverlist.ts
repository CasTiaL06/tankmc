import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export interface ServerEntry { id: string; name: string; address: string; desc: string; fav: boolean }
const ADDR = /^([A-Za-z0-9](?:[A-Za-z0-9.\-]{0,251}[A-Za-z0-9])?)(?::(\d{1,5}))?$/

// "host" veya "host:port" (IPv6 desteklenmez). Geçersizse null.
export function parseAddress(s: string): { host: string; port: number | null } | null {
  const m = ADDR.exec(s.trim()); if (!m || m[1].includes('..')) return null
  const port = m[2] ? Number(m[2]) : null
  if (port !== null && (port < 1 || port > 65535)) return null
  return { host: m[1].toLowerCase(), port }
}
export function sanitizeList(raw: unknown): ServerEntry[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>(), out: ServerEntry[] = []
  for (const x of raw.slice(0, 200)) {
    const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const a = typeof r.address === 'string' ? parseAddress(r.address) : null
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 40) : ''
    if (!a || !name) continue
    let id = typeof r.id === 'string' && /^[\w-]{1,64}$/.test(r.id) ? r.id : crypto.randomUUID()
    if (seen.has(id)) id = crypto.randomUUID(); seen.add(id)
    out.push({ id, name, address: a.port ? `${a.host}:${a.port}` : a.host, desc: typeof r.desc === 'string' ? r.desc.trim().slice(0, 120) : '', fav: r.fav === true })
  }
  return out
}
const file = (dir: string) => path.join(dir, 'servers.json')
export function load(dir: string): ServerEntry[] { try { return sanitizeList(JSON.parse(fs.readFileSync(file(dir), 'utf8'))) } catch { return [] } }
export function save(dir: string, l: ServerEntry[]) {
  fs.mkdirSync(dir, { recursive: true }); const tmp = file(dir) + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(l, null, 2)); fs.renameSync(tmp, file(dir))
}
