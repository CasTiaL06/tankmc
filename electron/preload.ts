import { contextBridge, ipcRenderer } from 'electron'
function sub<T>(ch: string, cb: (v: T) => void) {
  const h = (_: unknown, v: T) => cb(v)
  ipcRenderer.on(ch, h)
  return () => { ipcRenderer.removeListener(ch, h) }
}
contextBridge.exposeInMainWorld('tank', {
  platform: process.platform,
  game: {
    versions: () => ipcRenderer.invoke('game:versions'),
    play: (id: string) => ipcRenderer.invoke('game:play', id),
    onProgress: (cb: (p: { text: string; pct: number }) => void) => sub('game:progress', cb),
    onState: (cb: (s: { state: string; message?: string }) => void) => sub('game:state', cb),
  },
  auth: {
    restore: () => ipcRenderer.invoke('auth:restore'),
    login: () => ipcRenderer.invoke('auth:login'),
    cancel: () => ipcRenderer.invoke('auth:cancel'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    onCode: (cb: (c: { userCode: string; url: string }) => void) => {
      const h = (_: unknown, c: { userCode: string; url: string }) => cb(c)
      ipcRenderer.on('auth:code', h)
      return () => { ipcRenderer.removeListener('auth:code', h) }
    },
  },
})
