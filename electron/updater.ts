import { createHash } from 'crypto'

// GitHub Releases tabanlı güncelleme mantığı (ağ ve electron'dan bağımsız; test edilebilir).
export interface Asset { name: string; url: string; size: number; digest?: string }
export interface Release { version: string; tag: string; notes: string; prerelease: boolean; page: string; assets: Asset[] }
export const SUMS = 'TankClient-SHA256.txt'

export function parseVer(v: string): { core: number[]; pre: string[] } | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(v).trim())
  return m ? { core: [+m[1], +m[2], +m[3]], pre: m[4] ? m[4].split('.') : [] } : null
}
// SemVer sıralaması: 0.0.9 < 0.0.10, 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0
export function cmpVer(a: string, b: string): number {
  const x = parseVer(a), y = parseVer(b); if (!x || !y) return 0
  for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i] < y.core[i] ? -1 : 1
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i], q = y.pre[i]
    if (p === undefined) return -1; if (q === undefined) return 1; if (p === q) continue
    const pn = /^\d+$/.test(p), qn = /^\d+$/.test(q)
    if (pn && qn) return +p < +q ? -1 : 1
    if (pn) return -1; if (qn) return 1
    return p < q ? -1 : 1
  }
  return 0
}
const REPO = /^[\w.-]+\/[\w.-]+$/

export function mapRelease(r: any, repo: string): Release | null {
  if (!r || r.draft === true || !parseVer(String(r.tag_name))) return null
  const base = `https://github.com/${repo}/releases/download/`
  const assets: Asset[] = (Array.isArray(r.assets) ? r.assets : []).filter((a: any) => a && /^[\w.\-]{1,120}$/.test(String(a.name)) && typeof a.browser_download_url === 'string' && a.browser_download_url.startsWith(base) && Number.isFinite(a.size))
    .map((a: any) => ({ name: a.name, url: a.browser_download_url, size: a.size, digest: typeof a.digest === 'string' && /^sha256:[0-9a-f]{64}$/i.test(a.digest) ? a.digest : undefined }))
  const page = typeof r.html_url === 'string' && r.html_url.startsWith(`https://github.com/${repo}/`) ? r.html_url : `https://github.com/${repo}/releases`
  return { version: String(r.tag_name).replace(/^v/, ''), tag: String(r.tag_name), notes: String(r.body ?? '').slice(0, 1500), prerelease: r.prerelease === true, page, assets }
}
// Mevcut sürümden yüksek olanların en yükseği (beta kapalıysa ön sürümler atlanır)
export function pickRelease(list: unknown, repo: string, current: string, beta: boolean): Release | null {
  const c = (Array.isArray(list) ? list : []).map(r => mapRelease(r, repo)).filter((r): r is Release => !!r && (beta || !r.prerelease) && cmpVer(r.version, current) > 0)
  return c.sort((a, b) => cmpVer(b.version, a.version))[0] ?? null
}
export const pickAsset = (rel: Release, mode: 'portable' | 'installed'): Asset | null =>
  rel.assets.find(a => (mode === 'portable' ? /^TankClient-Portable-.*\.exe$/ : /^TankClient-Setup-.*\.exe$/).test(a.name)) ?? null

// Beklenen SHA-256: önce sürümdeki özet dosyası, yoksa GitHub'ın asset özeti. İkisi de yoksa kurulum reddedilir.
export async function expectedHash(rel: Release, asset: Asset, getText: (url: string) => Promise<string>): Promise<string> {
  const sums = rel.assets.find(a => a.name === SUMS)
  if (sums) for (const line of (await getText(sums.url)).split(/\r?\n/)) {
    const [h, f] = line.trim().split(/\s+/)
    if (f && f.replace(/^\*/, '') === asset.name && /^[0-9a-f]{64}$/i.test(h)) return h.toLowerCase()
  }
  if (asset.digest) return asset.digest.slice(7).toLowerCase()
  throw new Error('Bu sürümde doğrulama özeti (SHA-256) yok; güvenlik için otomatik kurulum yapılmadı. Sürüm sayfasından indirebilirsin.')
}
export function verifySha256(buf: Buffer, want: string) {
  if (createHash('sha256').update(buf).digest('hex') !== want.toLowerCase()) throw new Error('İndirilen dosya doğrulanamadı (SHA-256 uyuşmuyor); kurulum yapılmadı.')
}
export async function checkForUpdate(o: { repo: string; current: string; beta: boolean; mode: 'portable' | 'installed' }, io: { getJson(url: string): Promise<any> }) {
  if (!REPO.test(o.repo)) throw new Error('Güncelleme deposu tanımlı değil')
  const rel = pickRelease(await io.getJson(`https://api.github.com/repos/${o.repo}/releases?per_page=15`), o.repo, o.current, o.beta)
  return rel ? { release: rel, asset: pickAsset(rel, o.mode) } : null
}
