import { contextBridge, ipcRenderer } from 'electron'
function sub<T>(ch: string, cb: (v: T) => void) {
  const h = (_: unknown, v: T) => cb(v)
  ipcRenderer.on(ch, h)
  return () => { ipcRenderer.removeListener(ch, h) }
}
contextBridge.exposeInMainWorld('tank', {
  platform: process.platform,
  mods: {
    search: (o: unknown) => ipcRenderer.invoke('mods:search', o),
    project: (id: string) => ipcRenderer.invoke('mods:project', id),
    versions: (kind: string, p: string, i?: string) => ipcRenderer.invoke('mods:versions', kind, p, i),
    instances: () => ipcRenderer.invoke('mods:instances'),
    create: (n: string, mc: string, ld: string) => ipcRenderer.invoke('mods:create', n, mc, ld),
    remove: (id: string) => ipcRenderer.invoke('mods:delete', id),
    install: (i: string, p: string, v?: string) => ipcRenderer.invoke('mods:install', i, p, v),
    uninstall: (i: string, p: string) => ipcRenderer.invoke('mods:uninstall', i, p),
    toggle: (i: string, p: string) => ipcRenderer.invoke('mods:toggle', i, p),
    check: (i: string) => ipcRenderer.invoke('mods:check', i),
    update: (i: string, p: string) => ipcRenderer.invoke('mods:update', i, p),
    installPack: (p: string, v?: string) => ipcRenderer.invoke('mods:installPack', p, v),
    open: (u: string) => ipcRenderer.invoke('app:open', u),
  },
  win: { min: () => ipcRenderer.invoke('win:min'), max: () => ipcRenderer.invoke('win:max'), close: () => ipcRenderer.invoke('win:close') },
  acc: {
    list: () => ipcRenderer.invoke('acc:list'), add: (n: string) => ipcRenderer.invoke('acc:add', n),
    remove: (id: string) => ipcRenderer.invoke('acc:remove', id), select: (id: string) => ipcRenderer.invoke('acc:select', id),
  },
  update: {
    state: () => ipcRenderer.invoke('update:state'),
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    apply: () => ipcRenderer.invoke('update:apply'),
    notes: () => ipcRenderer.invoke('update:notes'),
    onState: (cb: (s: unknown) => void) => sub('update:state', cb),
  },
  downloads: {
    list: () => ipcRenderer.invoke('downloads:list'),
    cancel: (id: string) => ipcRenderer.invoke('downloads:cancel', id),
    clear: () => ipcRenderer.invoke('downloads:clear'),
    onUpdate: (cb: (t: unknown[]) => void) => sub('downloads:update', cb),
  },
  stats: { get: () => ipcRenderer.invoke('stats:get') },
  news: { get: () => ipcRenderer.invoke('news:get') },
  servers: {
    list: () => ipcRenderer.invoke('servers:list'),
    save: (l: unknown) => ipcRenderer.invoke('servers:save', l),
    ping: (address: string) => ipcRenderer.invoke('servers:ping', address),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (s: unknown) => ipcRenderer.invoke('settings:set', s),
    pick: (kind: 'java' | 'folder') => ipcRenderer.invoke('settings:pick', kind),
  },
  game: {
    versions: () => ipcRenderer.invoke('game:versions'),
    play: (id: string, address?: string, profileId?: string) => ipcRenderer.invoke('game:play', id, address, profileId),
    onProgress: (cb: (p: { text: string; pct: number }) => void) => sub('game:progress', cb),
    onState: (cb: (s: { state: string; message?: string }) => void) => sub('game:state', cb),
  },
  auth: {
    restore: () => ipcRenderer.invoke('auth:restore'),
    login: () => ipcRenderer.invoke('auth:login'),
    cancel: () => ipcRenderer.invoke('auth:cancel'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    skin: () => ipcRenderer.invoke('auth:skin'),
    onStep: (cb: (t: string) => void) => sub('auth:step', cb),
    onCode: (cb: (c: { userCode: string; url: string }) => void) => {
      const h = (_: unknown, c: { userCode: string; url: string }) => cb(c)
      ipcRenderer.on('auth:code', h)
      return () => { ipcRenderer.removeListener('auth:code', h) }
    },
  },
})
