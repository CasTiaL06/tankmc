import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
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

// Taşınabilir sürüm: veri exe'nin yanındaki TankClient-Data klasöründe. Kurulumlu sürüm: %APPDATA%\TankClient.
// Eski TANKmc-Data / TANKmc verisi varsa kopyalanır (eskisi silinmez).
app.setName('TankClient')
const data = resolveDataDir({ portableDir: process.env.PORTABLE_EXECUTABLE_DIR, appData: app.getPath('appData') })
app.setPath('userData', data.dir)

let win: BrowserWindow
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 620,
    backgroundColor: '#08080a', autoHideMenuBar: true, title: 'TankClient',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  if (app.isPackaged) win.loadFile(path.join(__dirname, '../dist/index.html'))
  else win.loadURL('http://localhost:5173')
}
ipcMain.handle('auth:restore', async () => { const r = await auth.restore(); return r.user ? { ok: true, user: r.user } : { ok: false, error: r.notice ?? '' } })
ipcMain.handle('auth:login', async () => {
  try { return { ok: true, user: await auth.login(c => win.webContents.send('auth:code', c)) } }
  catch (e) { return { ok: false, error: auth.friendly(e) } }
})
ipcMain.handle('auth:cancel', () => auth.cancelLogin())
ipcMain.handle('auth:logout', () => auth.logout())
ipcMain.handle('game:versions', async () => { try { return { ok: true, versions: await game.listVersions() } } catch (e) { return { ok: false, error: 'Sürüm listesi alınamadı: ' + (e as Error).message } } })
ipcMain.handle('game:play', (_e, id: unknown, address: unknown, profileId: unknown) => {
  if (game.busy()) return { ok: false, error: 'Oyun zaten hazırlanıyor veya çalışıyor.' }
  let version = id, profileDir: string | undefined
  if (profileId != null) {
    const p = typeof profileId === 'string' ? mi.loadAll(mctx()).find(x => x.id === profileId) : undefined
    if (!p) return { ok: false, error: 'Profil bulunamadı.' }
    if (p.loader !== 'vanilla') return { ok: false, error: `${p.loader} ile oyun başlatma henüz desteklenmiyor (sonraki aşama).` }
    version = p.mc; profileDir = mi.profileDir(mctx(), p.id) // profil kendi klasöründe (dünyalar, ayarlar) çalışır
  }
  if (typeof version !== 'string' || !/^[\w.\-]{1,40}$/.test(version)) return { ok: false, error: 'Geçersiz sürüm.' }
  let join: { host: string; port: number | null } | undefined
  if (address != null) {
    join = typeof address === 'string' ? servers.parseAddress(address) ?? undefined : undefined
    if (!join) return { ok: false, error: 'Geçersiz sunucu adresi.' }
  }
  const cfg = settings.sanitize(settings.load(data.dir), maxRam())
  void game.play(version, (ch, p) => {
    win.webContents.send(ch, p)
    const st = ch === 'game:state' ? (p as { state: string }).state : ''
    if (st === 'running' && cfg.minimizeOnLaunch) win.minimize()
    if ((st === 'exited' || st === 'error') && win.isMinimized()) { win.restore(); win.focus() }
  }, cfg, join, profileDir)
  return { ok: true }
})

// Ayarlar: yalnızca doğrulanmış değerler diske yazılır. RAM üst sınırı = fiziksel bellek - 1 GB.
const maxRam = () => Math.min(32768, Math.max(2048, (Math.floor(os.totalmem() / 2 ** 30) - 1) * 1024))
ipcMain.handle('settings:get', () => ({ settings: settings.sanitize(settings.load(data.dir), maxRam()), maxRamMb: maxRam(), defaultGameDir: path.join(data.dir, 'minecraft') }))
ipcMain.handle('settings:set', (_e, raw: unknown) => { const s = settings.sanitize(raw, maxRam()); settings.save(data.dir, s); return s })
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
h('news:get', () => news.latest().then(items => ({ news: items })))
h('mods:search', (o: unknown) => mr.search(o as any))
h('mods:project', (id: unknown) => mr.project(String(id)))
h('mods:instances', () => ({ instances: mi.loadAll(mctx()) }))
h('mods:create', (n: unknown, mc: unknown, ld: unknown) => mi.createInstance(mctx(), String(n), String(mc), String(ld)))
h('mods:delete', (id: unknown) => mi.deleteInstance(mctx(), String(id)))
h('mods:install', (i: unknown, p: unknown) => mi.installMod(mctx(), String(i), String(p)))
h('mods:uninstall', (i: unknown, p: unknown) => mi.removeMod(mctx(), String(i), String(p)))
h('mods:toggle', (i: unknown, p: unknown) => mi.toggleMod(mctx(), String(i), String(p)))
h('mods:check', (i: unknown) => mi.checkUpdates(mctx(), String(i)))
h('mods:update', (i: unknown, p: unknown) => mi.updateMod(mctx(), String(i), String(p)))
h('mods:installPack', (p: unknown) => mi.installModpack(mctx(), String(p)))
ipcMain.handle('app:open', (_e, u: unknown) => { if (typeof u === 'string' && /^https:\/\/(modrinth\.com|github\.com)\//.test(u)) void shell.openExternal(u) })
app.whenReady().then(() => {
  if (data.migrationError) dialog.showErrorBox('TankClient', `Eski veriler (TANKmc) yeni klasöre kopyalanamadı. Eski klasörün yerinde duruyor, hiçbir veri silinmedi.\n\n${data.migrationError}`)
  createWindow()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
