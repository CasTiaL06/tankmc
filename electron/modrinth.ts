import { createHash } from 'crypto'
import { fetchBuffer } from './fetchbytes'

// Modrinth ücretsiz genel API'si (v2). Her istekte tanımlayıcı User-Agent gönderilir.
export const UA = 'TankClient/0.1.0 (open-source Minecraft launcher)'
export const LOADERS = ['fabric', 'forge', 'neoforge', 'quilt']
export const ID = /^[A-Za-z0-9_-]{1,64}$/
const BASE = 'https://api.modrinth.com/v2'
const HOSTS = new Set(['cdn.modrinth.com', 'github.com', 'raw.githubusercontent.com', 'gitlab.com'])
const SORTS = ['relevance', 'downloads', 'follows', 'newest', 'updated']

export const isAllowedUrl = (u: unknown): u is string => { try { const x = new URL(String(u)); return x.protocol === 'https:' && HOSTS.has(x.hostname) } catch { return false } }

export async function getJson(p: string, params: Record<string, string | number> = {}): Promise<any> {
  const u = new URL(BASE + p); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v))
  const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) })
  if (!r.ok) throw new Error(r.status === 404 ? 'Modrinth’te bulunamadı' : r.status === 429 ? 'Modrinth istek sınırına ulaşıldı, biraz bekleyip tekrar dene' : `Modrinth hatası (${r.status})`)
  return r.json()
}
export async function getBytes(url: string, max = 300_000_000, opts: { signal?: AbortSignal; onBytes?: (n: number) => void } = {}): Promise<Buffer> {
  if (!isAllowedUrl(url)) throw new Error('İzin verilmeyen indirme adresi')
  return fetchBuffer(url, { headers: { 'User-Agent': UA }, signal: opts.signal, onBytes: opts.onBytes, max, timeoutMs: 180000, label: decodeURIComponent(new URL(url).pathname.split('/').pop() ?? 'dosya') })
}
export function verifyHash(buf: Buffer, h?: { sha1?: string; sha512?: string }) {
  const ok = h?.sha512 ? createHash('sha512').update(buf).digest('hex') === h.sha512 : h?.sha1 ? createHash('sha1').update(buf).digest('hex') === h.sha1 : false
  if (!ok) throw new Error('İndirilen dosya doğrulanamadı (hash uyuşmuyor veya yok)')
}
// Yayın türü önceliği: release > beta > alpha (liste yeniden eskiye sıralı gelir)
export function pickVersion(list: any[]): any | null {
  for (const t of ['release', 'beta', 'alpha']) { const v = list.find(x => x?.version_type === t && x.files?.length); if (v) return v }
  return list.find(x => x?.files?.length) ?? null
}
export function facets(o: { type: string; mc?: string; loader?: string; category?: string }): string {
  const f: string[][] = [[`project_type:${o.type === 'modpack' ? 'modpack' : 'mod'}`]]
  if (o.mc && /^[\w.\-]{1,40}$/.test(o.mc)) f.push([`versions:${o.mc}`])
  if (o.loader && LOADERS.includes(o.loader)) f.push([`categories:${o.loader}`])
  if (o.category && /^[a-z-]{1,30}$/.test(o.category)) f.push([`categories:${o.category}`])
  return JSON.stringify(f)
}
export async function search(o: { query?: string; type?: string; mc?: string; loader?: string; category?: string; sort?: string; offset?: number }, api = getJson) {
  const r = await api('/search', { query: String(o?.query ?? '').slice(0, 100), facets: facets({ type: o?.type ?? 'mod', mc: o?.mc, loader: o?.loader, category: o?.category }), index: SORTS.includes(o?.sort ?? '') ? o.sort! : 'relevance', offset: Math.max(0, Math.min(1000, Math.trunc(Number(o?.offset) || 0))), limit: 20 })
  const img = (u: unknown) => (typeof u === 'string' && u.startsWith('https://cdn.modrinth.com/') ? u : null)
  return { total: Number(r.total_hits) || 0, hits: (r.hits as any[]).map(h => ({ id: String(h.project_id), slug: String(h.slug), title: String(h.title), desc: String(h.description ?? ''), icon: img(h.icon_url), author: String(h.author ?? ''), downloads: Number(h.downloads) || 0, follows: Number(h.follows) || 0, cats: ((h.display_categories ?? []) as string[]).filter(c => !LOADERS.includes(c)).slice(0, 3), loaders: ((h.categories ?? []) as string[]).filter(c => LOADERS.includes(c)), cover: img(h.featured_gallery) ?? img(h.gallery?.[0]), updated: String(h.date_modified ?? '').slice(0, 10), type: String(h.project_type) })) }
}
export async function project(id: string, api = getJson) {
  if (!ID.test(id)) throw new Error('Geçersiz proje kimliği')
  const p = await api('/project/' + id), img = (u: unknown): u is string => typeof u === 'string' && u.startsWith('https://cdn.modrinth.com/')
  const links: { label: string; url: string }[] = [] // yalnızca kaynak kodu bağlantısı (varsa)
  if (typeof p.source_url === 'string' && p.source_url.startsWith('https://github.com/')) links.push({ label: 'Kaynak kodu', url: p.source_url })
  return { project: { id: String(p.id), title: String(p.title), desc: String(p.description ?? ''), gallery: ((p.gallery ?? []) as any[]).filter(g => img(g.url)).slice(0, 6).map(g => ({ url: g.url as string, title: String(g.title ?? '') })), links, license: String(p.license?.name ?? ''), downloads: Number(p.downloads) || 0, client: String(p.client_side ?? ''), server: String(p.server_side ?? ''), loaders: ((p.loaders ?? []) as string[]).filter(l => LOADERS.includes(l)) } }
}
