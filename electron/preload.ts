import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('tank', {
  platform: process.platform,
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
