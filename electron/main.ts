import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'path'
import * as auth from './auth'
import { resolveDataDir } from './paths'

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
app.whenReady().then(() => {
  if (data.migrationError) dialog.showErrorBox('TankClient', `Eski veriler (TANKmc) yeni klasöre kopyalanamadı. Eski klasörün yerinde duruyor, hiçbir veri silinmedi.\n\n${data.migrationError}`)
  createWindow()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
