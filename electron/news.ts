import { UA } from './modrinth'

// Mojang'ın resmî (ücretsiz) başlatıcı içeriği: Java sürüm notları
const BASE = 'https://launchercontent.mojang.com'
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '')
export function mapNews(r: any) {
  const list: any[] = Array.isArray(r?.entries) ? r.entries : []
  return list.filter(e => e && e.type === 'release' && str(e.title, 1)).sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))).slice(0, 3).map(e => ({
    title: str(e.title, 100), version: str(e.version, 30), type: 'release', text: str(e.shortText, 220),
    image: typeof e.image?.url === 'string' && /^\/[\w\-./]+$/.test(e.image.url) && !e.image.url.includes('..') ? BASE + e.image.url : null,
    date: typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(e.date) ? e.date.slice(0, 10) : null }))
}
let cache: { at: number; v: ReturnType<typeof mapNews> } | null = null
export async function latest() {
  if (cache && Date.now() - cache.at < 600_000) return cache.v
  const r = await fetch(BASE + '/v2/javaPatchNotes.json', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error('Haberler alınamadı (' + r.status + ')')
  const v = mapNews(await r.json()); cache = { at: Date.now(), v }; return v
}
