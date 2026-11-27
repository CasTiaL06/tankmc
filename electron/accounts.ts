import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Çevrimdışı hesaplar yalnızca Minecraft sahibi bir Microsoft hesabı bağlıyken eklenir ve kullanılır (kontrol ana süreçte yapılır).
export interface Offline { id: string; name: string; uuid: string }
export interface Accounts { offline: Offline[]; active: string } // active: 'ms' veya çevrimdışı hesap kimliği
export const NAME = /^[A-Za-z0-9_]{3,16}$/
// Java'daki UUID.nameUUIDFromBytes("OfflinePlayer:<ad>") ile aynı: MD5, sürüm 3
export function offlineUuid(name: string): string {
  const h = crypto.createHash('md5').update('OfflinePlayer:' + name, 'utf8').digest()
  h[6] = (h[6] & 0x0f) | 0x30; h[8] = (h[8] & 0x3f) | 0x80
  return h.toString('hex')
}
export function sanitize(raw: any): Accounts {
  const seen = new Set<string>(), offline: Offline[] = []
  for (const x of (Array.isArray(raw?.offline) ? raw.offline : []).slice(0, 5)) {
    if (typeof x?.name !== 'string' || !NAME.test(x.name) || seen.has(x.name.toLowerCase())) continue
    seen.add(x.name.toLowerCase())
    offline.push({ id: /^[\w-]{1,64}$/.test(String(x.id)) ? x.id : crypto.randomUUID(), name: x.name, uuid: offlineUuid(x.name) })
  }
  return { offline, active: typeof raw?.active === 'string' && offline.some(o => o.id === raw.active) ? raw.active : 'ms' }
}
const file = (d: string) => path.join(d, 'accounts.json')
export const load = (d: string): Accounts => { try { return sanitize(JSON.parse(fs.readFileSync(file(d), 'utf8'))) } catch { return { offline: [], active: 'ms' } } }
export function save(d: string, a: Accounts) { fs.mkdirSync(d, { recursive: true }); const t = file(d) + '.tmp'; fs.writeFileSync(t, JSON.stringify(a, null, 2)); fs.renameSync(t, file(d)) }
export function add(a: Accounts, name: string): Accounts {
  if (!NAME.test(name)) throw new Error('Kullanıcı adı 3–16 karakter olmalı; yalnızca harf, rakam ve alt çizgi')
  if (a.offline.length >= 5) throw new Error('En fazla 5 çevrimdışı hesap eklenebilir')
  if (a.offline.some(o => o.name.toLowerCase() === name.toLowerCase())) throw new Error('Bu adla bir çevrimdışı hesap zaten var')
  return { offline: [...a.offline, { id: crypto.randomUUID(), name, uuid: offlineUuid(name) }], active: a.active }
}
export const remove = (a: Accounts, id: string): Accounts => ({ offline: a.offline.filter(o => o.id !== id), active: a.active === id ? 'ms' : a.active })
export function select(a: Accounts, id: string): Accounts {
  if (id !== 'ms' && !a.offline.some(o => o.id === id)) throw new Error('Hesap bulunamadı')
  return { ...a, active: id }
}
