import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import os from 'os'
import path from 'path'
import * as settings from './settings'
import * as auth from './auth'
import { resolveDataDir } from './paths'
import * as game from './launcher'

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
ipcMain.handle('game:play', (_e, id: unknown) => {
  if (typeof id !== 'string' || !/^[\w.\-]{1,40}$/.test(id)) return { ok: false, error: 'Geçersiz sürüm.' }
  if (game.busy()) return { ok: false, error: 'Oyun zaten hazırlanıyor veya çalışıyor.' }
  const cfg = settings.sanitize(settings.load(data.dir), maxRam())
  void game.play(id, (ch, p) => {
    win.webContents.send(ch, p)
    const st = ch === 'game:state' ? (p as { state: string }).state : ''
    if (st === 'running' && cfg.minimizeOnLaunch) win.minimize()
    if ((st === 'exited' || st === 'error') && win.isMinimized()) { win.restore(); win.focus() }
  }, cfg)
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
app.whenReady().then(() => {
  if (data.migrationError) dialog.showErrorBox('TankClient', `Eski veriler (TANKmc) yeni klasöre kopyalanamadı. Eski klasörün yerinde duruyor, hiçbir veri silinmedi.\n\n${data.migrationError}`)
  createWindow()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
