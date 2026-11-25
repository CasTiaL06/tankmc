export type Loader = 'fabric' | 'quilt'
export interface IO { getJson(url: string): Promise<any>; getText(url: string): Promise<string> }

const META = { fabric: 'https://meta.fabricmc.net/v2', quilt: 'https://meta.quiltmc.org/v3' }
const HOSTS = new Set(['maven.fabricmc.net', 'maven.quiltmc.org', 'repo1.maven.org'])
const SEG = /^[\w.\-+]+$/, SHA1 = /^[0-9a-f]{40}$/

// "grup:ad:sürüm[:sınıflandırıcı][@uzantı]" -> Maven dosya yolu
export function mavenPath(name: string): string {
  const [coord, ext = 'jar'] = name.split('@'), [g, a, v, cl] = coord.split(':')
  if (name.includes('..') || ![g, a, v].every(x => x && SEG.test(x)) || (cl && !SEG.test(cl)) || !/^[a-z]{2,5}$/.test(ext)) throw new Error('Geçersiz kütüphane adı: ' + name)
  return `${g.replace(/\./g, '/')}/${a}/${v}/${a}-${v}${cl ? '-' + cl : ''}.${ext}`
}
export async function pickLoader(kind: Loader, mc: string, io: IO): Promise<string> {
  const list = await io.getJson(`${META[kind]}/versions/loader/${encodeURIComponent(mc)}`)
  const ok = (Array.isArray(list) ? list : []).map(e => e?.loader).filter(l => l && typeof l.version === 'string' && SEG.test(l.version))
  const v = ok.find(l => (kind === 'fabric' ? l.stable === true : !/alpha|beta|pre|rc/i.test(l.version))) ?? ok[0]
  if (!v) throw new Error(`${kind === 'fabric' ? 'Fabric' : 'Quilt'}, Minecraft ${mc} için desteklenmiyor`)
  return v.version as string
}
const key = (n: string) => { const p = n.split(':'); return p.slice(0, 2).join(':') + (p[3] ? ':' + p[3] : '') }

// Vanilla sürüm JSON'unu loader profiliyle birleştirir: loader kütüphaneleri önce gelir, aynı kütüphanenin Mojang kopyası atılır.
export async function applyLoader(kind: Loader, mc: string, vj: any, io: IO): Promise<any> {
  const lv = await pickLoader(kind, mc, io)
  const lj = await io.getJson(`${META[kind]}/versions/loader/${encodeURIComponent(mc)}/${encodeURIComponent(lv)}/profile/json`)
  if (!lj || lj.inheritsFrom !== mc || !/^[\w.$]+$/.test(String(lj.mainClass)) || !Array.isArray(lj.libraries)) throw new Error('Loader profili geçersiz')
  if (!vj.arguments) throw new Error('Bu Minecraft sürümü loader ile başlatılamıyor')
  const libs: any[] = []
  for (const l of lj.libraries) {
    const path = mavenPath(String(l?.name)), base = String(l?.url ?? 'https://repo1.maven.org/maven2/'), url = (base.endsWith('/') ? base : base + '/') + path, u = new URL(url)
    if (u.protocol !== 'https:' || !HOSTS.has(u.hostname)) throw new Error('İzin verilmeyen kütüphane adresi: ' + url)
    const sha1 = typeof l.sha1 === 'string' && SHA1.test(l.sha1) ? l.sha1 : (await io.getText(url + '.sha1')).trim().split(/\s+/)[0]
    if (!SHA1.test(sha1)) throw new Error('Kütüphane doğrulama özeti alınamadı: ' + l.name)
    libs.push({ name: l.name, downloads: { artifact: { path, url, sha1 } } })
  }
  const mine = new Set(libs.map(l => key(l.name)))
  return { ...vj, mainClass: lj.mainClass, loaderVersion: lv,
    libraries: [...libs, ...vj.libraries.filter((l: any) => !mine.has(key(String(l.name))))],
    arguments: { game: [...vj.arguments.game, ...(lj.arguments?.game ?? [])], jvm: [...vj.arguments.jvm, ...(lj.arguments?.jvm ?? [])] } }
}
