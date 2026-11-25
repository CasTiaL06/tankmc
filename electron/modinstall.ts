import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { isAllowedUrl, LOADERS, pickVersion, verifyHash } from './modrinth'
import { safeJoin } from './launchargs'
import { readZip } from './zip'

export interface ModRec { projectId: string; versionId: string; title: string; version: string; file: string; icon: string | null; enabled: boolean; dep: boolean }
export interface Instance { id: string; name: string; mc: string; loader: string; mods: ModRec[]; pack?: { projectId: string; versionId: string } }
export interface Api { getJson(p: string, params?: Record<string, string | number>): Promise<any>; getBytes(url: string): Promise<Buffer> }
export interface Ctx { root: string; api: Api }

const ID = /^[\w-]{1,64}$/, FILE = /^[\w.+() \[\]-]{1,150}\.jar$/, MC = /^[\w.\-]{1,40}$/
const LOADER_SET = ['vanilla', ...LOADERS]
const listFile = (c: Ctx) => path.join(c.root, 'instances.json')
const instDir = (c: Ctx, id: string) => safeJoin(path.join(c.root, 'instances'), id)
const modsDir = (c: Ctx, i: Instance) => path.join(instDir(c, i.id), 'mods')

function clean(x: any): Instance | null {
  if (!x || !ID.test(String(x.id)) || typeof x.name !== 'string' || !MC.test(String(x.mc)) || !LOADER_SET.includes(x.loader)) return null
  const mods: ModRec[] = (Array.isArray(x.mods) ? x.mods : []).filter((m: any) => m && ID.test(String(m.projectId)) && FILE.test(String(m.file))).slice(0, 2000).map((m: any) => ({
    projectId: m.projectId, versionId: String(m.versionId ?? '').slice(0, 64), title: String(m.title ?? m.file).slice(0, 80), version: String(m.version ?? '').slice(0, 40), file: m.file,
    icon: typeof m.icon === 'string' && m.icon.startsWith('https://cdn.modrinth.com/') ? m.icon : null, enabled: m.enabled !== false, dep: m.dep === true }))
  return { id: x.id, name: x.name.slice(0, 40), mc: x.mc, loader: x.loader, mods, pack: x.pack && ID.test(String(x.pack.projectId)) ? { projectId: x.pack.projectId, versionId: String(x.pack.versionId ?? '').slice(0, 64) } : undefined }
}
export function loadAll(c: Ctx): Instance[] {
  try { const r = JSON.parse(fs.readFileSync(listFile(c), 'utf8')); return Array.isArray(r) ? r.map(clean).filter((x): x is Instance => !!x) : [] } catch { return [] }
}
const commit = (c: Ctx, l: Instance[]) => { fs.mkdirSync(c.root, { recursive: true }); const t = listFile(c) + '.tmp'; fs.writeFileSync(t, JSON.stringify(l, null, 2)); fs.renameSync(t, listFile(c)) }
let chain: Promise<unknown> = Promise.resolve()
// Profil işlemleri sırayla çalışır (aynı anda iki yazma olmaz)
function lock<T>(f: () => Promise<T>): Promise<T> { const r = chain.then(f); chain = r.catch(() => {}); return r }
const get = (c: Ctx, id: string) => { if (!ID.test(id)) throw new Error('Geçersiz profil'); const l = loadAll(c), i = l.find(x => x.id === id); if (!i) throw new Error('Profil bulunamadı'); return { l, i } }
const versionsFor = (c: Ctx, i: Instance, pid: string): Promise<any[]> => { if (!ID.test(pid)) throw new Error('Geçersiz mod kimliği'); return c.api.getJson(`/project/${pid}/version`, { loaders: JSON.stringify([i.loader]), game_versions: JSON.stringify([i.mc]) }) }
function pickFile(ver: any) {
  const f = (ver.files ?? []).find((x: any) => x.primary) ?? ver.files?.[0]
  if (!f || !isAllowedUrl(f.url)) throw new Error('Güvenli indirme adresi bulunamadı')
  const name = String(f.filename).replace(/[^\w.+() \[\]-]/g, '_')
  if (!FILE.test(name)) throw new Error('Geçersiz dosya adı: ' + f.filename)
  return { url: f.url as string, name, hashes: f.hashes }
}

export const createInstance = (c: Ctx, name: string, mc: string, loader: string) => lock(async () => {
  name = name.trim().slice(0, 40)
  if (!name || !MC.test(mc) || !LOADER_SET.includes(loader)) throw new Error('Geçersiz profil bilgisi')
  const l = loadAll(c); if (l.length >= 50) throw new Error('En fazla 50 profil oluşturulabilir')
  const instance: Instance = { id: crypto.randomUUID(), name, mc, loader, mods: [] }
  fs.mkdirSync(path.join(instDir(c, instance.id), 'mods'), { recursive: true }); l.push(instance); commit(c, l)
  return { instance }
})
export const deleteInstance = (c: Ctx, id: string) => lock(async () => {
  const { l } = get(c, id); fs.rmSync(instDir(c, id), { recursive: true, force: true }); commit(c, l.filter(x => x.id !== id)); return {}
})

type W = { titles: string[]; files: string[] }
async function add(c: Ctx, i: Instance, pid: string, ver: any, dep: boolean, w: W, depth = 0): Promise<void> {
  if (i.mods.some(m => m.projectId === pid)) return
  if (i.mods.length >= 300) throw new Error('Profil mod sınırına ulaştı (300)')
  const f = pickFile(ver)
  if (i.mods.some(m => m.file === f.name)) throw new Error('Aynı adlı başka bir mod dosyası zaten var: ' + f.name)
  const buf = await c.api.getBytes(f.url); verifyHash(buf, f.hashes)
  const dir = modsDir(c, i); fs.mkdirSync(dir, { recursive: true })
  const dest = safeJoin(dir, f.name); fs.writeFileSync(dest, buf); w.files.push(dest)
  const p = await c.api.getJson('/project/' + pid)
  i.mods.push({ projectId: pid, versionId: String(ver.id).slice(0, 64), title: String(p.title ?? f.name).slice(0, 80), version: String(ver.version_number ?? '').slice(0, 40), file: f.name, icon: typeof p.icon_url === 'string' && p.icon_url.startsWith('https://cdn.modrinth.com/') ? p.icon_url : null, enabled: true, dep })
  w.titles.push(String(p.title ?? f.name))
  if (depth >= 4) return
  for (const d of ver.dependencies ?? []) {
    if (d.dependency_type !== 'required' || !ID.test(String(d.project_id)) || i.mods.some(m => m.projectId === d.project_id)) continue
    const dv = d.version_id && ID.test(String(d.version_id)) ? await c.api.getJson('/version/' + d.version_id) : pickVersion(await versionsFor(c, i, d.project_id))
    if (!dv) throw new Error(`Gerekli bağımlılık (${d.project_id}) ${i.mc} / ${i.loader} ile uyumlu değil`)
    await add(c, i, d.project_id, dv, true, w, depth + 1)
  }
}
export const installMod = (c: Ctx, instId: string, pid: string) => lock(async () => {
  const { l, i } = get(c, instId)
  if (i.loader === 'vanilla') throw new Error('Vanilla profile mod kurulamaz. Fabric, Forge, NeoForge veya Quilt profili seç.')
  const ver = pickVersion(await versionsFor(c, i, pid)); if (!ver) throw new Error(`Bu mod ${i.mc} / ${i.loader} ile uyumlu değil`)
  const w: W = { titles: [], files: [] }
  try { await add(c, i, pid, ver, false, w); commit(c, l) } catch (e) { w.files.forEach(f => fs.rmSync(f, { force: true })); throw e }
  return { installed: w.titles, instance: i }
})
const rec = (i: Instance, pid: string) => { const m = i.mods.find(x => x.projectId === pid); if (!m) throw new Error('Mod bu profilde kurulu değil'); return m }
export const removeMod = (c: Ctx, instId: string, pid: string) => lock(async () => {
  const { l, i } = get(c, instId), m = rec(i, pid), p = safeJoin(modsDir(c, i), m.file)
  fs.rmSync(p, { force: true }); fs.rmSync(p + '.disabled', { force: true }); i.mods = i.mods.filter(x => x !== m); commit(c, l); return { instance: i }
})
export const toggleMod = (c: Ctx, instId: string, pid: string) => lock(async () => {
  const { l, i } = get(c, instId), m = rec(i, pid), on = safeJoin(modsDir(c, i), m.file), off = on + '.disabled'
  if (m.enabled) { if (fs.existsSync(on)) fs.renameSync(on, off) } else if (fs.existsSync(off)) fs.renameSync(off, on)
  m.enabled = !m.enabled; commit(c, l); return { instance: i }
})
export const checkUpdates = (c: Ctx, instId: string) => lock(async () => {
  const { i } = get(c, instId), updates: { projectId: string; from: string; to: string }[] = []
  const list = i.mods.filter(m => !m.projectId.startsWith('file-')).slice(0, 100); let k = 0, failed = 0
  await Promise.all(Array.from({ length: 4 }, async () => { while (k < list.length) { const m = list[k++]
    try { const v = pickVersion(await versionsFor(c, i, m.projectId)); if (v && v.id !== m.versionId) updates.push({ projectId: m.projectId, from: m.version, to: String(v.version_number) }) } catch { failed++ } } }))
  return { updates, failed }
})
export const updateMod = (c: Ctx, instId: string, pid: string) => lock(async () => {
  const { l, i } = get(c, instId), m = rec(i, pid)
  const ver = pickVersion(await versionsFor(c, i, pid)); if (!ver) throw new Error('Uyumlu sürüm bulunamadı')
  const f = pickFile(ver); if (f.name !== m.file && i.mods.some(x => x.file === f.name)) throw new Error('Aynı adlı başka bir mod dosyası var')
  const buf = await c.api.getBytes(f.url); verifyHash(buf, f.hashes)
  const dir = modsDir(c, i), sfx = m.enabled ? '' : '.disabled', dest = safeJoin(dir, f.name + sfx), old = safeJoin(dir, m.file + sfx)
  fs.writeFileSync(dest, buf); if (old !== dest) fs.rmSync(old, { force: true })
  m.versionId = String(ver.id).slice(0, 64); m.version = String(ver.version_number ?? '').slice(0, 40); m.file = f.name; commit(c, l); return { instance: i }
})

// .mrpack (Modrinth mod paketi): dizin dosyası + indirmeler + overrides. Her dosya hash ile doğrulanır; adres izin listesine uymak zorundadır.
export const installModpack = (c: Ctx, pid: string) => lock(async () => {
  if (!ID.test(pid)) throw new Error('Geçersiz proje kimliği')
  const vers: any[] = await c.api.getJson(`/project/${pid}/version`)
  const ver = pickVersion(vers.filter(v => v.files?.some((f: any) => /\.mrpack$/i.test(f.filename))))
  const pf = ver?.files.find((f: any) => /\.mrpack$/i.test(f.filename))
  if (!pf || !isAllowedUrl(pf.url)) throw new Error('Bu mod paketinin .mrpack dosyası bulunamadı')
  const zbuf = await c.api.getBytes(pf.url); verifyHash(zbuf, pf.hashes)
  const entries = readZip(zbuf), idx = entries.find(e => e.name === 'modrinth.index.json')
  if (!idx) throw new Error('Paket dizin dosyası (modrinth.index.json) yok')
  const j = JSON.parse(idx.read().toString('utf8'))
  if (j.formatVersion !== 1 || j.game !== 'minecraft' || !Array.isArray(j.files) || j.files.length > 2000) throw new Error('Desteklenmeyen mod paketi biçimi')
  const d = j.dependencies ?? {}, mc = String(d.minecraft ?? '')
  if (!MC.test(mc)) throw new Error('Paket Minecraft sürümünü belirtmiyor')
  const loader = d['fabric-loader'] ? 'fabric' : d['quilt-loader'] ? 'quilt' : d.neoforge ? 'neoforge' : d.forge ? 'forge' : 'vanilla'
  const l = loadAll(c); if (l.length >= 50) throw new Error('En fazla 50 profil oluşturulabilir')
  const inst: Instance = { id: crypto.randomUUID(), name: String(j.name ?? 'Mod paketi').trim().slice(0, 40) || 'Mod paketi', mc, loader, mods: [], pack: { projectId: pid, versionId: String(ver.id).slice(0, 64) } }
  const dir = instDir(c, inst.id); fs.mkdirSync(dir, { recursive: true })
  try {
    const files = j.files.filter((f: any) => f?.env?.client !== 'unsupported'); let k = 0
    await Promise.all(Array.from({ length: 6 }, async () => { while (k < files.length) {
      const f = files[k++], url = (f.downloads ?? []).find((u: unknown) => isAllowedUrl(u))
      if (!url || typeof f.path !== 'string') throw new Error('Pakette güvenli indirme adresi olmayan dosya var')
      const dest = safeJoin(dir, f.path), buf = await c.api.getBytes(url); verifyHash(buf, f.hashes)
      fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf)
      const nm = path.basename(f.path)
      if (/^mods\/[^/]+\.jar$/i.test(f.path) && FILE.test(nm)) inst.mods.push({ projectId: 'file-' + String(f.hashes?.sha1 ?? crypto.randomUUID()).replace(/[^\w]/g, '').slice(0, 12), versionId: '', title: nm.replace(/\.jar$/i, ''), version: '', file: nm, icon: null, enabled: true, dep: false })
    } }))
    for (const pre of ['overrides/', 'client-overrides/']) for (const e of entries) {
      if (e.dir || !e.name.startsWith(pre)) continue
      const dest = safeJoin(dir, e.name.slice(pre.length)); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, e.read())
    }
    l.push(inst); commit(c, l); return { instance: inst }
  } catch (e) { fs.rmSync(dir, { recursive: true, force: true }); throw e }
})
