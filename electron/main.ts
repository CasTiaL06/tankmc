import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import * as auth from './auth'

// Taşınabilir (portable) sürümde tüm launcher verisi exe'nin yanındaki klasörde tutulur.
if (process.env.PORTABLE_EXECUTABLE_DIR) app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'TANKmc-Data'))

let win: BrowserWindow
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 620,
    backgroundColor: '#08080a', autoHideMenuBar: true, title: 'TANKmc',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  if (app.isPackaged) win.loadFile(path.join(__dirname, '../dist/index.html'))
  else win.loadURL('http://localhost:5173')
}
ipcMain.handle('auth:restore', async () => { const user = await auth.restore(); return user ? { ok: true, user } : { ok: false, error: '' } })
ipcMain.handle('auth:login', async () => {
  try { return { ok: true, user: await auth.login(c => win.webContents.send('auth:code', c)) } }
  catch (e) { return { ok: false, error: auth.friendly(e) } }
})
ipcMain.handle('auth:cancel', () => auth.cancelLogin())
ipcMain.handle('auth:logout', () => auth.logout())
app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
