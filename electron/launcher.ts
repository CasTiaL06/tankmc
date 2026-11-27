import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { spawn, execFile } from 'child_process'
import { buildArgs, joinArgs, ruleOk, safeJoin } from './launchargs'
import * as auth from './auth'
import type { Handle } from './downloads'
import { readBody } from './fetchbytes'
import { applyLoader } from './loaders'
import { installLoader } from './forgeinstall'
import type { Settings } from './settings'

type Emit = (ch: 'game:progress' | 'game:state', p: unknown) => void
const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const RUNTIMES = 'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json'
const ASSETS = 'https://resources.download.minecraft.net/'
let running = false, mf: any, rootDir = ''
const root = () => rootDir
export const busy = () => running

const getJson = async (u: string): Promise<any> => { const r = await fetch(u); if (!r.ok) throw new Error(`İndirme hatası (${r.status}): ${u}`); return r.json() }
const sha1 = (f: string) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex')
async function get(url: string, dest: string, hash?: string, t?: Handle, size?: number) {
  if (fs.existsSync(dest) && (!hash || sha1(dest) === hash)) { t?.cached(size ?? fs.statSync(dest).size); return }
  const r = await fetch(url, { signal: t?.signal }); if (!r.ok) throw new Error(`İndirme hatası (${r.status}): ${url}`)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const tmp = dest + '.part'; fs.writeFileSync(tmp, await readBody(r, n => t?.bytes(n)))
  if (hash && sha1(tmp) !== hash) { fs.rmSync(tmp); throw new Error('Dosya doğrulaması başarısız (SHA1): ' + path.basename(dest)) }
  fs.renameSync(tmp, dest); t?.fileDone()
}
async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>, tick: () => void) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const t = items[i++]; await fn(t); tick() } }))
}
const getText = async (u: string): Promise<string> => { const r = await fetch(u); if (!r.ok) throw new Error(`İndirme hatası (${r.status}): ${u}`); return r.text() }
const manifest = async () => (mf ??= await getJson(MANIFEST))

// 1.8.9 ve sonrası resmî sürümler (yeniden eskiye)
export async function listVersions(): Promise<string[]> {
  const rel = (await manifest()).versions.filter((v: any) => v.type === 'release'), i = rel.findIndex((v: any) => v.id === '1.8.9')
  return (i < 0 ? rel : rel.slice(0, i + 1)).map((v: any) => v.id as string)
}

// Mojang'ın resmî (ücretsiz) Java çalışma ortamı. Şimdilik 64-bit Windows.
async function ensureJava(component: string, step: (t: string, p: number) => void, t?: Handle): Promise<string> {
  if (process.arch !== 'x64') throw new Error('Otomatik Java yönetimi şimdilik yalnızca 64-bit Windows destekler.')
  const dir = path.join(root(), 'runtime', component), ok = path.join(dir, '.ok'), exe = path.join(dir, 'bin', 'java.exe')
  if (fs.existsSync(ok)) return exe
  const e = (await getJson(RUNTIMES))['windows-x64']?.[component]?.[0]
  if (!e) throw new Error('Mojang Java çalışma ortamı bulunamadı: ' + component)
  const files = Object.entries((await getJson(e.manifest.url)).files as Record<string, any>).filter(([, f]) => f.type === 'file')
  let n = 0
  t?.expect(files.reduce((s, [, f]) => s + (f.downloads?.raw?.size ?? 0), 0), files.length)
  await pool(files, 8, async ([rel, f]) => get(f.downloads.raw.url, safeJoin(dir, rel), f.downloads.raw.sha1, t, f.downloads.raw.size), () => step(`Java indiriliyor… ${++n}/${files.length}`, 0.03 + 0.25 * n / files.length))
  fs.writeFileSync(ok, ''); return exe
}

export async function play(id: string, emit: Emit, cfg: Settings, join?: { host: string; port: number | null }, profileDir?: string, loader?: string, dl?: Handle) {
  running = true
  rootDir = cfg.gameDir || path.join(app.getPath('userData'), 'minecraft')
  const step = (text: string, pct: number) => emit('game:progress', { text, pct })
  try {
    emit('game:state', { state: 'preparing' })
    const s = await auth.ensureSession()
    if (!s) throw new Error('Oynamak için önce Microsoft ile giriş yapmalısın.')
    const entry = (await manifest()).versions.find((v: any) => v.id === id)
    if (!entry) throw new Error('Bilinmeyen Minecraft sürümü: ' + id)
    const R = root(), vdir = path.join(R, 'versions', id)
    step('Sürüm bilgisi alınıyor…', 0.01)
    let vj = await getJson(entry.url)
    fs.mkdirSync(vdir, { recursive: true }); fs.writeFileSync(path.join(vdir, id + '.json'), JSON.stringify(vj))
    if (loader === 'fabric' || loader === 'quilt') {
      step('Loader hazırlanıyor…', 0.02)
      vj = await applyLoader(loader, id, vj, { getJson, getText: async u => { const r = await fetch(u); if (!r.ok) throw new Error(`İndirme hatası (${r.status}): ${u}`); return r.text() } })
    }
    let java: string
    if (cfg.javaAuto) java = await ensureJava(vj.javaVersion?.component ?? 'jre-legacy', step, dl)
    else {
      if (!/\.exe$/i.test(cfg.javaPath) || !fs.existsSync(cfg.javaPath)) throw new Error('Seçilen Java bulunamadı veya geçersiz: ' + (cfg.javaPath || '(boş)'))
      java = cfg.javaPath
    }

    if (loader === 'forge' || loader === 'neoforge') {
      // Resmî kurulum programı vanilla sürüm dosyasını ve Java'yı bekler; sonuç profil JSON'u vanilla ile birleştirilir
      await get(vj.downloads.client.url, path.join(vdir, id + '.jar'), vj.downloads.client.sha1, dl, vj.downloads.client.size)
      const run = (args: string[], logFile: string) => new Promise<number>((resolve, reject) => {
        fs.mkdirSync(path.dirname(logFile), { recursive: true }); const lg = fs.createWriteStream(logFile)
        const p = spawn(java, ['-Djava.awt.headless=true', ...args], { cwd: R, windowsHide: true })
        const kill = () => { p.kill() }; dl?.signal.addEventListener('abort', kill, { once: true })
        const to = setTimeout(kill, 15 * 60_000)
        p.stdout.on('data', b => lg.write(b)); p.stderr.on('data', b => lg.write(b))
        p.on('error', e => { clearTimeout(to); reject(e) }); p.on('exit', c => { clearTimeout(to); lg.end(); resolve(c ?? -1) })
      })
      vj = await installLoader(loader, id, R, vj, { getJson, getText, download: (u, d, h) => get(u, d, h, dl), run, step: s => step(s, 0.3) }, path.join(app.getPath('userData'), 'logs', `${loader}-install-${Date.now()}.log`))
    }
    const jobs: { url: string; dest: string; sha1?: string; size?: number }[] = [], cp: string[] = [], natives: string[] = []
    const jar = path.join(vdir, id + '.jar')
    jobs.push({ url: vj.downloads.client.url, dest: jar, sha1: vj.downloads.client.sha1, size: vj.downloads.client.size })
    for (const l of vj.libraries.filter((l: any) => ruleOk(l.rules))) {
      const a = l.downloads?.artifact
      if (a) {
        const d = safeJoin(path.join(R, 'libraries'), a.path)
        if (a.url) jobs.push({ url: a.url, dest: d, sha1: a.sha1, size: a.size })
        else if (!fs.existsSync(d)) throw new Error('Loader kütüphanesi eksik (kurulum tamamlanmamış olabilir): ' + a.path) // kurulum programının ürettiği dosyalar
        cp.push(d)
      }
      const cl = l.natives?.windows?.replace('${arch}', '64'), na = cl && l.downloads?.classifiers?.[cl]
      if (na) { const d = safeJoin(path.join(R, 'libraries'), na.path); jobs.push({ url: na.url, dest: d, sha1: na.sha1, size: na.size }); natives.push(d) }
    }
    const aidx = path.join(R, 'assets', 'indexes', vj.assetIndex.id + '.json')
    dl?.expect(vj.assetIndex.size ?? 0, 1)
    await get(vj.assetIndex.url, aidx, vj.assetIndex.sha1, dl, vj.assetIndex.size)
    for (const o of Object.values(JSON.parse(fs.readFileSync(aidx, 'utf8')).objects as Record<string, { hash: string; size?: number }>))
      jobs.push({ url: ASSETS + o.hash.slice(0, 2) + '/' + o.hash, dest: path.join(R, 'assets', 'objects', o.hash.slice(0, 2), o.hash), sha1: o.hash, size: o.size })
    const uniq = [...new Map(jobs.map(j => [j.dest, j])).values()]
    let n = 0
    dl?.expect(uniq.reduce((s, j) => s + (j.size ?? 0), 0), uniq.length)
    await pool(uniq, 12, j => get(j.url, j.dest, j.sha1, dl, j.size), () => step(`Dosyalar indiriliyor ve doğrulanıyor… ${++n}/${uniq.length}`, 0.3 + 0.6 * n / uniq.length))

    const nd = path.join(vdir, 'natives'); fs.mkdirSync(nd, { recursive: true })
    for (const j of natives) await new Promise<void>((res, rej) => execFile('tar', ['-xf', j, '-C', nd], e => e ? rej(new Error('Native dosyalar açılamadı: ' + e.message)) : res()))

    dl?.finish() // indirme aşaması bitti
    const v = { auth_player_name: s.name, version_name: id, game_directory: profileDir ?? R, assets_root: path.join(R, 'assets'), assets_index_name: vj.assetIndex.id, auth_uuid: s.uuid, auth_access_token: s.mcToken, user_type: 'msa', version_type: vj.type, natives_directory: nd, library_directory: path.join(R, 'libraries'), classpath_separator: ';', launcher_name: 'TankClient', launcher_version: app.getVersion(), classpath: [...cp, jar].join(';'), clientid: '', auth_xuid: '', user_properties: '{}', game_assets: path.join(R, 'assets', 'virtual', 'legacy') }
    const [w, h] = cfg.resolution.split('x')
    const args = [`-Xmx${cfg.ramMb}M`, ...buildArgs(vj, v), '--width', w, '--height', h, ...(cfg.fullscreen ? ['--fullscreen'] : []), ...(join ? joinArgs(vj, join.host, join.port) : [])]
    step('Minecraft başlatılıyor…', 0.95)
    const logDir = path.join(app.getPath('userData'), 'logs'); fs.mkdirSync(logDir, { recursive: true })
    const log = fs.createWriteStream(path.join(logDir, `game-${Date.now()}.log`)) // erişim token'ı günlüğe yazılmaz
    if (profileDir) fs.mkdirSync(profileDir, { recursive: true })
    const p = spawn(java, args, { cwd: profileDir ?? R, windowsHide: true })
    let up = false
    const mark = () => { if (!up) { up = true; emit('game:state', { state: 'running' }) } }
    const on = (b: Buffer) => { log.write(b); if (/Setting user:|LWJGL|Backend library/.test(b.toString())) mark() }
    p.stdout.on('data', on); p.stderr.on('data', on)
    const t = setTimeout(mark, 15000)
    p.on('error', e => { clearTimeout(t); running = false; emit('game:state', { state: 'error', message: 'Java başlatılamadı: ' + e.message }) })
    p.on('exit', code => { clearTimeout(t); log.end(); running = false; emit('game:state', code === 0 ? { state: 'exited' } : { state: 'error', message: `Oyun beklenmedik şekilde kapandı (kod ${code}). Günlükler: ${logDir}` }) })
  } catch (e) {
    running = false
    const msg = dl?.cancelled ? 'İndirme iptal edildi.' : (e as Error).message
    dl?.fail(msg)
    emit('game:state', { state: 'error', message: msg })
  }
}
