import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import os from 'os'
import path from 'path'
import * as settings from './settings'
import * as auth from './auth'
import { resolveDataDir } from './paths'
import * as game from './launcher'
import * as servers from './serverlist'
import { ping } from './mcping'
import * as mr from './modrinth'
import * as mi from './modinstall'
import * as news from './news'
import * as stats from './stats'
import { Downloads } from './downloads'
import * as up from './updater'
import * as gameopts from './gameopts'
import * as accounts from './accounts'
import * as tr from './translate'
import { UPDATE_REPO } from './config'
import { readBody } from './fetchbytes'
import fs from 'fs'
import { spawn } from 'child_process'

// Taşınabilir sürüm: veri exe'nin yanındaki TankClient-Data klasöründe. Kurulumlu sürüm: %APPDATA%\TankClient.
// Eski TANKmc-Data / TANKmc verisi varsa kopyalanır (eskisi silinmez).
app.setName('TankClient')
const data = resolveDataDir({ portableDir: process.env.PORTABLE_EXECUTABLE_DIR, appData: app.getPath('appData') })
app.setPath('userData', data.dir)

let win: BrowserWindow
// İndirme merkezi: değişiklikler en fazla ~3 kez/sn arayüze iletilir
let dlPending = false
const dl = new Downloads(data.dir, () => { if (dlPending) return; dlPending = true; setTimeout(() => { dlPending = false; win?.webContents.send('downloads:update', dl.list()) }, 300) })
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 620,
    backgroundColor: '#08080a', frame: false, title: 'TankClient',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  if (app.isPackaged) win.loadFile(path.join(__dirname, '../dist/index.html'))
  else win.loadURL('http://localhost:5173')
  win.webContents.on('did-finish-load', () => applyZoom())
}
// Özel başlık çubuğu: pencere denetimleri arayüzden yönetilir
ipcMain.handle('win:min', () => win.minimize())
ipcMain.handle('win:max', () => { if (win.isMaximized()) win.unmaximize(); else win.maximize() })
ipcMain.handle('win:close', () => win.close())
ipcMain.handle('auth:restore', async () => { const r = await auth.restore(); return r.user ? { ok: true, user: r.user } : { ok: false, error: r.notice ?? '' } })
ipcMain.handle('auth:login', async () => {
  try { return { ok: true, user: await auth.login(c => win.webContents.send('auth:code', c), t => win.webContents.send('auth:step', t)) } }
  catch (e) { return { ok: false, error: auth.friendly(e) } }
})
ipcMain.handle('auth:cancel', () => auth.cancelLogin())
ipcMain.handle('auth:logout', () => auth.logout())
ipcMain.handle('game:versions', async () => { try { return { ok: true, versions: await game.listVersions() } } catch (e) { return { ok: false, error: 'Sürüm listesi alınamadı: ' + (e as Error).message } } })
ipcMain.handle('game:play', (_e, id: unknown, address: unknown, profileId: unknown) => {
  if (game.busy()) return { ok: false, error: 'Oyun zaten hazırlanıyor veya çalışıyor.' }
  let version = id, profileDir: string | undefined, loader: string | undefined, profileName: string | undefined
  if (profileId != null) {
    const p = typeof profileId === 'string' ? mi.loadAll(mctx()).find(x => x.id === profileId) : undefined
    if (!p) return { ok: false, error: 'Profil bulunamadı.' }
    if (!['vanilla', 'fabric', 'quilt', 'forge', 'neoforge'].includes(p.loader)) return { ok: false, error: `${p.loader} ile oyun başlatma henüz desteklenmiyor (sonraki aşama).` }
    version = p.mc; loader = p.loader; profileName = p.name; profileDir = mi.profileDir(mctx(), p.id) // profil kendi klasöründe (dünyalar, ayarlar) çalışır
  }
  if (typeof version !== 'string' || !/^[\w.\-]{1,40}$/.test(version)) return { ok: false, error: 'Geçersiz sürüm.' }
  let join: { host: string; port: number | null } | undefined
  if (address != null) {
    join = typeof address === 'string' ? servers.parseAddress(address) ?? undefined : undefined
    if (!join) return { ok: false, error: 'Geçersiz sunucu adresi.' }
  }
  const cfg = settings.sanitize(settings.load(data.dir), maxRam())
  // Görüş mesafesi (0 = oyunun kendi ayarı): her başlatmada oyun klasöründeki options.txt'ye yazılır
  if (cfg.renderDistance > 0) { try { gameopts.applyOptions(profileDir ?? (cfg.gameDir || path.join(data.dir, 'minecraft')), { renderDistance: String(cfg.renderDistance) }) } catch { /* yazılamadı: oyun yine başlar */ } }
  const acc = accounts.load(data.dir), offAcc = acc.active === 'ms' ? undefined : acc.offline.find(o => o.id === acc.active), off = offAcc ? { name: offAcc.name, uuid: offAcc.uuid } : undefined
  const label = profileName ? `${profileName} · ${version}` : `Vanilla ${version}`; let started = 0
  const t = dl.start('game', `Minecraft ${version}${loader && loader !== 'vanilla' ? ' · ' + loader : ''}${profileName ? ' · ' + profileName : ''}`)
  void game.play(version, (ch, p) => {
    win.webContents.send(ch, p)
    const st = ch === 'game:state' ? (p as { state: string }).state : ''
    if (st === 'running') started = Date.now()
    if ((st === 'exited' || st === 'error') && started) { stats.record(data.dir, { start: started, end: Date.now(), label, version }); started = 0 }
    if (st === 'running' && cfg.minimizeOnLaunch) win.minimize()
    if ((st === 'exited' || st === 'error') && win.isMinimized()) { win.restore(); win.focus() }
  }, cfg, join, profileDir, loader, t, off)
  return { ok: true }
})

// Ayarlar: yalnızca doğrulanmış değerler diske yazılır. RAM üst sınırı = fiziksel bellek - 1 GB.
const maxRam = () => Math.min(32768, Math.max(2048, (Math.floor(os.totalmem() / 2 ** 30) - 1) * 1024))
ipcMain.handle('settings:get', () => ({ settings: settings.sanitize(settings.load(data.dir), maxRam()), maxRamMb: maxRam(), defaultGameDir: path.join(data.dir, 'minecraft') }))
const applyZoom = () => { try { win.webContents.setZoomFactor(settings.sanitize(settings.load(data.dir), maxRam()).uiScale / 100) } catch { /* pencere yok */ } }
ipcMain.handle('settings:set', (_e, raw: unknown) => { const s = settings.sanitize(raw, maxRam()); settings.save(data.dir, s); applyZoom(); return s })
ipcMain.handle('settings:pick', async (_e, kind: unknown) => {
  if (kind !== 'java' && kind !== 'folder') return null
  const r = await dialog.showOpenDialog(win, kind === 'java' ? { properties: ['openFile'], filters: [{ name: 'Java', extensions: ['exe'] }] } : { properties: ['openDirectory', 'createDirectory'] })
  return r.canceled ? null : r.filePaths[0]
})
// Sunucu listesi: diskte servers.json; durum bilgisi doğrudan sunucudan okunur (sahte sayı yok).
ipcMain.handle('servers:list', () => servers.load(data.dir))
ipcMain.handle('servers:save', (_e, raw: unknown) => { const l = servers.sanitizeList(raw); servers.save(data.dir, l); return l })
ipcMain.handle('servers:ping', async (_e, address: unknown) => {
  const a = typeof address === 'string' ? servers.parseAddress(address) : null
  return a ? ping(a.host, a.port) : { online: false, error: 'Geçersiz adres' }
})
// Mod kütüphanesi (Modrinth). Ağ ve dosya işlemleri yalnızca ana süreçte yapılır; renderer'a ham erişim verilmez.
const h = (ch: string, fn: (...a: any[]) => unknown) => ipcMain.handle(ch, async (_e, ...a) => { try { return { ok: true, ...(await fn(...a) as object) } } catch (e) { return { ok: false, error: (e as Error).message } } })
const mctx = () => ({ root: data.dir, api: { getJson: mr.getJson, getBytes: (u: string) => mr.getBytes(u) } })
// Açıklama çevirisi: ücretsiz MyMemory servisi, önbellekli ve günlük sınırlı; olmazsa özgün metin gösterilir
const decode = (s: string) => s.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const trn = tr.createTranslator(data.dir, async text => {
  const u = new URL('https://api.mymemory.translated.net/get'); u.searchParams.set('q', text); u.searchParams.set('langpair', 'Autodetect|tr')
  const r = await fetch(u, { headers: { 'User-Agent': mr.UA }, signal: AbortSignal.timeout(8000) })
  if (r.status === 429) return { quota: true }
  const j: any = await r.json().catch(() => ({})), t = String(j?.responseData?.translatedText ?? '')
  if (/MYMEMORY WARNING/i.test(t) || j?.quotaFinished === true || Number(j?.responseStatus) === 429) return { quota: true }
  return Number(j?.responseStatus) === 200 && t ? { text: decode(t) } : {}
})
const trOn = () => settings.load(data.dir).translate
const trList = async <T extends { desc: string }>(items: T[]) => { if (!trOn() || !items.length) return; const m = await trn.many(items.map(x => x.desc)); for (const x of items) x.desc = m.get(x.desc) ?? x.desc }
// Mod/paket işlemleri indirme merkezinde görevdir: ilerleme, hız ve iptal buradan yönetilir
const withTask = async (kind: 'mod' | 'pack', title: string, run: (c: mi.Ctx) => Promise<any>, name: (r: any) => string) => {
  const t = dl.start(kind, title)
  try {
    const r = await run({ root: data.dir, api: { getJson: mr.getJson, getBytes: async (u: string, size?: number) => {
      t.expect(size ?? 0, 1); const b = await mr.getBytes(u, 300_000_000, { signal: t.signal, onBytes: n => t.bytes(n) }); t.fileDone(); return b } } })
    t.finish(name(r)); return r
  } catch (e) { t.fail(t.cancelled ? 'İptal edildi' : (e as Error).message); throw e }
}
// Otomatik güncelleme (GitHub Releases). İndirilen dosya SHA-256 ile doğrulanır; kurulum yalnızca kullanıcı onayıyla başlar.
interface UState { phase: 'idle' | 'checking' | 'uptodate' | 'available' | 'downloading' | 'ready' | 'error'; current: string; mode: 'portable' | 'installed'; repoSet: boolean; version?: string; notes?: string; prerelease?: boolean; canAuto?: boolean; page?: string; error?: string; file?: string }
let ust: UState = { phase: 'idle', current: app.getVersion(), mode: data.mode, repoSet: !!UPDATE_REPO }
let pendingUpdate: { release: up.Release; asset: up.Asset | null } | null = null
const setU = (p: Partial<UState>) => { ust = { ...ust, ...p }; win?.webContents.send('update:state', ust) }
const gh = async (u: string) => { const r = await fetch(u, { headers: { 'User-Agent': mr.UA, Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error(r.status === 404 ? 'Depo veya sürüm bulunamadı (depo herkese açık mı?)' : r.status === 403 ? 'GitHub istek sınırına ulaşıldı, biraz sonra tekrar dene' : `GitHub hatası (${r.status})`); return r }
async function checkUpdate() {
  if (!UPDATE_REPO) return setU({ phase: 'error', error: 'Güncelleme deposu tanımlı değil (README).' })
  if (ust.phase === 'downloading' || ust.phase === 'ready') return
  setU({ phase: 'checking', error: undefined })
  try {
    const cfg = settings.sanitize(settings.load(data.dir), maxRam())
    const r = await up.checkForUpdate({ repo: UPDATE_REPO, current: app.getVersion(), beta: cfg.betaUpdates, mode: data.mode }, { getJson: async u => (await gh(u)).json() })
    if (!r) { pendingUpdate = null; return setU({ phase: 'uptodate', version: undefined, canAuto: undefined }) }
    pendingUpdate = r; setU({ phase: 'available', version: r.release.version, notes: r.release.notes, prerelease: r.release.prerelease, canAuto: !!r.asset, page: r.release.page })
  } catch (e) { setU({ phase: 'error', error: (e as Error).message }) }
}
async function downloadUpdate() {
  const p = pendingUpdate
  if (!p || !p.asset || ust.phase !== 'available') throw new Error('İndirilecek güncelleme yok')
  const a = p.asset, t = dl.start('update', `TankClient ${p.release.version} güncellemesi`)
  setU({ phase: 'downloading', error: undefined })
  try {
    const want = await up.expectedHash(p.release, a, async u => (await gh(u)).text())
    t.expect(a.size, 1)
    const r = await fetch(a.url, { headers: { 'User-Agent': mr.UA }, signal: AbortSignal.any([AbortSignal.timeout(900000), t.signal]) })
    if (!r.ok) throw new Error(`İndirme hatası (${r.status})`)
    const buf = await readBody(r, n => t.bytes(n), 400_000_000)
    up.verifySha256(buf, want)
    // Portable: yeni EXE mevcut EXE'nin yanına; yazılamazsa (veya kurulumlu) veri klasöründeki updates altına
    const fallback = path.join(data.dir, 'updates', a.name); let dest = data.mode === 'portable' && process.env.PORTABLE_EXECUTABLE_DIR ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, a.name) : fallback
    try { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf) } catch { dest = fallback; fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf) }
    t.fileDone(); t.finish(); setU({ phase: 'ready', file: dest })
  } catch (e) {
    const msg = t.cancelled ? 'Güncelleme indirmesi iptal edildi.' : (e as Error).message
    t.fail(msg); setU({ phase: 'available', error: msg })
  }
}
function applyUpdate() {
  const f = ust.file
  if (ust.phase !== 'ready' || !f || !fs.existsSync(f)) throw new Error('Hazır güncelleme yok')
  const env = { ...process.env }; for (const k of Object.keys(env)) if (k.startsWith('PORTABLE_EXECUTABLE')) delete env[k]
  spawn(f, [], { detached: true, stdio: 'ignore', env }).unref(); app.quit() // kurulumlu: kurulum sihirbazı, portable: yeni sürüm açılır
}
h('update:state', () => ({ state: ust }))
h('update:check', async () => { await checkUpdate(); return { state: ust } })
h('update:download', async () => { await downloadUpdate(); return { state: ust } })
h('update:apply', () => { applyUpdate(); return {} })
h('update:notes', () => { if (ust.page && ust.page.startsWith(`https://github.com/${UPDATE_REPO}/`)) void shell.openExternal(ust.page); return {} })
h('downloads:list', () => ({ tasks: dl.list() }))
h('downloads:cancel', (id: unknown) => ({ cancelled: dl.cancel(String(id)) }))
h('downloads:clear', () => { dl.clear(); return {} })
h('stats:get', () => ({ stats: stats.summarize(stats.loadSessions(data.dir)) }))
h('news:get', async () => { const items = (await news.latest()).map(x => ({ ...x, desc: x.text })); await trList(items); return { news: items.map(({ desc, ...x }) => ({ ...x, text: desc })) } })
h('mods:search', async (o: unknown) => { const r = await mr.search(o as any); await trList(r.hits); return r })
h('mods:project', async (id: unknown) => { const r = await mr.project(String(id)); await trList([r.project]); return r })
h('mods:instances', () => ({ instances: mi.loadAll(mctx()) }))
h('mods:create', (n: unknown, mc: unknown, ld: unknown) => mi.createInstance(mctx(), String(n), String(mc), String(ld)))
h('mods:delete', (id: unknown) => mi.deleteInstance(mctx(), String(id)))
h('mods:versions', (k: unknown, p: unknown, i: unknown) => mi.listVersions(mctx(), k === 'pack' ? 'pack' : 'mod', String(p), i == null ? undefined : String(i)))
h('mods:install', (i: unknown, p: unknown, v: unknown) => withTask('mod', 'Mod kuruluyor…', c => mi.installMod(c, String(i), String(p), v == null ? undefined : String(v)), r => `Mod: ${r.installed.join(', ') || 'zaten kurulu'}`))
h('mods:uninstall', (i: unknown, p: unknown) => mi.removeMod(mctx(), String(i), String(p)))
h('mods:toggle', (i: unknown, p: unknown) => mi.toggleMod(mctx(), String(i), String(p)))
h('mods:check', (i: unknown) => mi.checkUpdates(mctx(), String(i)))
h('mods:update', (i: unknown, p: unknown) => withTask('mod', 'Mod güncelleniyor…', c => mi.updateMod(c, String(i), String(p)), () => 'Mod güncellendi'))
h('mods:installPack', (p: unknown, v: unknown) => withTask('pack', 'Mod paketi kuruluyor…', c => mi.installModpack(c, String(p), v == null ? undefined : String(v)), r => `Mod paketi: ${r.instance.name}`))
// Hesaplar: çevrimdışı hesap eklemek için sahiplik kanıtı olan (Minecraft sahibi) bir Microsoft oturumu şarttır
const accSave = (a: accounts.Accounts) => { accounts.save(data.dir, a); return { accounts: a } }
h('acc:list', () => ({ accounts: accounts.load(data.dir) }))
h('acc:add', async (name: unknown) => { if (!(await auth.ensureSession())) throw new Error('Çevrimdışı hesap eklemek için önce Minecraft sahibi bir Microsoft hesabıyla giriş yapmalısın.'); return accSave(accounts.add(accounts.load(data.dir), String(name))) })
h('acc:remove', (id: unknown) => accSave(accounts.remove(accounts.load(data.dir), String(id))))
h('acc:select', (id: unknown) => accSave(accounts.select(accounts.load(data.dir), String(id))))
h('auth:skin', async () => ({ skin: await auth.getSkin() }))
ipcMain.handle('app:open', (_e, u: unknown) => { if (typeof u === 'string' && /^https:\/\/(modrinth\.com|github\.com)\//.test(u)) void shell.openExternal(u) })
app.whenReady().then(() => {
  if (data.migrationError) dialog.showErrorBox('TankClient', `Eski veriler (TANKmc) yeni klasöre kopyalanamadı. Eski klasörün yerinde duruyor, hiçbir veri silinmedi.\n\n${data.migrationError}`)
  Menu.setApplicationMenu(null) // Alt tuşuyla açılan varsayılan menü çubuğu kaldırıldı
  createWindow()
  try { fs.rmSync(path.join(data.dir, 'updates'), { recursive: true, force: true }) } catch { /* yok say */ } // önceki güncelleme dosyaları
  setTimeout(() => { if (UPDATE_REPO && settings.load(data.dir).autoUpdate) void checkUpdate() }, 8000)
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
