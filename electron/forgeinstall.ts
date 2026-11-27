import fs from 'fs'
import path from 'path'

export type FLoader = 'forge' | 'neoforge'
export interface FIO {
  getJson(u: string): Promise<any>; getText(u: string): Promise<string>
  download(url: string, dest: string, sha1: string): Promise<void>
  run(args: string[], logFile: string): Promise<number>; step(t: string): void
}
const HOSTS = new Set(['maven.minecraftforge.net', 'maven.neoforged.net', 'files.minecraftforge.net'])
const PROMOS = 'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json'
const NEO_META = 'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml'
const NAME: Record<FLoader, string> = { forge: 'Forge', neoforge: 'NeoForge' }
const checkUrl = (u: string) => { const x = new URL(u); if (x.protocol !== 'https:' || !HOSTS.has(x.hostname)) throw new Error('İzin verilmeyen adres: ' + u); return u }
const mc = (v: string) => { const m = /^1\.(\d+)(?:\.(\d+))?$/.exec(v); return m ? { minor: +m[1], patch: m[2] ? +m[2] : 0 } : null }

// NeoForge sürümü Minecraft sürümüne bağlıdır: 1.21.4 -> 21.4.x, 1.21 -> 21.0.x (1.20.2 ve sonrası)
export function neoPrefix(v: string): string | null { const p = mc(v); return !p || p.minor < 20 || (p.minor === 20 && p.patch < 2) ? null : `${p.minor}.${p.patch}.` }
export function pickNeo(v: string, xml: string): string {
  const pre = neoPrefix(v); if (!pre) throw new Error(`NeoForge, Minecraft ${v} için desteklenmiyor (1.20.2 ve sonrası gerekir)`)
  const all = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1]).filter(x => x.startsWith(pre) && /^\d+\.\d+\.\d+(-beta)?$/.test(x))
  const stable = all.filter(x => !x.endsWith('-beta')), pool = stable.length ? stable : all, n = (x: string) => +x.split('-')[0].split('.')[2]
  if (!pool.length) throw new Error(`NeoForge, Minecraft ${v} için bulunamadı`)
  return pool.sort((a, b) => n(b) - n(a))[0]
}
export function pickForge(v: string, promos: any): string {
  const p = mc(v); if (!p || p.minor < 13) throw new Error(`Forge, Minecraft ${v} için desteklenmiyor (şimdilik 1.13 ve sonrası)`)
  const pr = promos?.promos ?? {}, f = pr[`${v}-recommended`] ?? pr[`${v}-latest`]
  if (typeof f !== 'string' || !/^[\w.\-]+$/.test(f)) throw new Error(`Forge, Minecraft ${v} için bulunamadı`)
  return `${v}-${f}`
}
const key = (n: string) => { const p = n.split(':'); return p.slice(0, 2).join(':') + (p[3] ? ':' + p[3] : '') }
// Kurulum programının ürettiği (inheritsFrom'lu) sürüm JSON'unu vanilla ile birleştirir; çocuk kütüphaneler önce, çakışanlar çocuğundur.
export function mergeInherited(vj: any, child: any): any {
  if (!child?.arguments || !Array.isArray(child.libraries)) throw new Error('Loader sürüm dosyası desteklenmeyen biçimde')
  const mine = new Set(child.libraries.map((l: any) => key(String(l.name))))
  return { ...vj, mainClass: child.mainClass, loaderId: child.id,
    libraries: [...child.libraries, ...vj.libraries.filter((l: any) => !mine.has(key(String(l.name))))],
    arguments: { game: [...(vj.arguments?.game ?? []), ...(child.arguments.game ?? [])], jvm: [...(vj.arguments?.jvm ?? []), ...(child.arguments.jvm ?? [])] } }
}
const readJson = (f: string) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
function findChild(R: string, v: string, token: string): { id: string; json: any } | null {
  const dir = path.join(R, 'versions'); let names: string[] = []
  try { names = fs.readdirSync(dir) } catch { return null }
  for (const id of names) {
    if (id.startsWith('.') || !/^[\w.\-+]+$/.test(id) || !id.includes(token)) continue
    const j = readJson(path.join(dir, id, id + '.json')); if (j && j.inheritsFrom === v) return { id, json: j }
  }
  return null
}

// Resmî kurulum programını (--installClient) çalıştırır; sonuç sürüm JSON'u okunur ve birleştirilir. Aynı sürüm tekrar kurulmaz.
export async function installLoader(kind: FLoader, v: string, R: string, vj: any, io: FIO, logFile: string): Promise<any> {
  io.step(`${NAME[kind]} sürümü seçiliyor…`)
  const ver = kind === 'forge' ? pickForge(v, await io.getJson(PROMOS)) : pickNeo(v, await io.getText(NEO_META))
  const token = kind === 'forge' ? ver.slice(v.length + 1) : ver
  const marker = path.join(R, 'versions', `.tankclient-${kind}-${ver}.json`)
  const have = readJson(marker)?.id as string | undefined
  let found = have && /^[\w.\-+]+$/.test(have) ? findChild(R, v, have) : null
  if (!found) {
    const base = kind === 'forge' ? `https://maven.minecraftforge.net/net/minecraftforge/forge/${ver}/forge-${ver}` : `https://maven.neoforged.net/releases/net/neoforged/neoforge/${ver}/neoforge-${ver}`
    const url = checkUrl(base + '-installer.jar'), sha1 = (await io.getText(url + '.sha1')).trim().split(/\s+/)[0]
    if (!/^[0-9a-f]{40}$/i.test(sha1)) throw new Error('Kurulum programının doğrulama özeti alınamadı')
    const jar = path.join(R, 'installers', `${kind}-${ver}-installer.jar`)
    io.step('Kurulum programı indiriliyor…'); await io.download(url, jar, sha1.toLowerCase())
    const lp = path.join(R, 'launcher_profiles.json') // kurulum programı bu dosyayı arar
    if (!fs.existsSync(lp)) fs.writeFileSync(lp, JSON.stringify({ profiles: {}, version: 3 }))
    io.step(`${NAME[kind]} kuruluyor… (ilk seferde birkaç dakika sürebilir)`)
    const code = await io.run(['-jar', jar, '--installClient', R], logFile)
    if (code !== 0) throw new Error(`${NAME[kind]} kurulumu başarısız (kod ${code}). Günlük: ${logFile}`)
    found = findChild(R, v, token)
    if (!found) throw new Error(`${NAME[kind]} kurulumu tamamlandı ama sürüm dosyası bulunamadı. Günlük: ${logFile}`)
    fs.writeFileSync(marker, JSON.stringify({ id: found.id })); fs.rmSync(jar, { force: true })
  }
  return mergeInherited(vj, found.json)
}
