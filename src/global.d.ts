type AuthResult = { ok: true; user: { name: string; uuid: string } } | { ok: false; error: string }
interface AppSettings { ramMb: number; resolution: string; fullscreen: boolean; javaAuto: boolean; javaPath: string; gameDir: string; minimizeOnLaunch: boolean; autoUpdate: boolean; betaUpdates: boolean; renderDistance: number }
interface PingRes { online: boolean; players?: number; max?: number; version?: string; motd?: string; favicon?: string; latency?: number; error?: string }
interface SrvEntry { id: string; name: string; address: string; desc: string; fav: boolean }
interface ModHit { id: string; slug: string; title: string; desc: string; icon: string | null; author: string; downloads: number; follows: number; cats: string[]; loaders: string[]; cover: string | null; type: string }
interface ModProject { id: string; title: string; desc: string; gallery: { url: string; title: string }[]; links: { label: string; url: string }[]; license: string; downloads: number; client: string; server: string; loaders: string[] }
interface ModRec { projectId: string; versionId: string; title: string; version: string; file: string; icon: string | null; enabled: boolean; dep: boolean }
interface Inst { id: string; name: string; mc: string; loader: string; mods: ModRec[]; icon?: string | null; pack?: { projectId: string; versionId: string } }
interface PlayStats { totalMs: number; count: number; recent: { start: number; end: number; label: string; version: string }[]; top: { label: string; ms: number } | null }
interface DlTask { id: string; kind: 'game' | 'mod' | 'pack' | 'update'; title: string; state: 'active' | 'done' | 'error' | 'cancelled'; done: number; total: number; files: number; filesDone: number; speed: number; eta: number | null; startedAt: number; endedAt: number | null; error: string | null }
interface UpdateState { phase: 'idle' | 'checking' | 'uptodate' | 'available' | 'downloading' | 'ready' | 'error'; current: string; mode: 'portable' | 'installed'; repoSet: boolean; version?: string; notes?: string; prerelease?: boolean; canAuto?: boolean; page?: string; error?: string; file?: string }
interface NewsItem { title: string; version: string; type: string; text: string; image: string | null; date: string | null }
interface ModUpdate { projectId: string; from: string; to: string }
type Rr<T = object> = ({ ok: true } & T) | { ok: false; error: string }
interface ModsApi {
  search(o: { query: string; type: string; mc?: string; loader?: string; category?: string; sort?: string; offset?: number }): Promise<Rr<{ total: number; hits: ModHit[] }>>
  project(id: string): Promise<Rr<{ project: ModProject }>>
  instances(): Promise<Rr<{ instances: Inst[] }>>
  create(n: string, mc: string, ld: string): Promise<Rr<{ instance: Inst }>>
  remove(id: string): Promise<Rr>
  install(i: string, p: string): Promise<Rr<{ installed: string[]; instance: Inst }>>
  uninstall(i: string, p: string): Promise<Rr<{ instance: Inst }>>
  toggle(i: string, p: string): Promise<Rr<{ instance: Inst }>>
  check(i: string): Promise<Rr<{ updates: ModUpdate[]; failed: number }>>
  update(i: string, p: string): Promise<Rr<{ instance: Inst }>>
  installPack(p: string): Promise<Rr<{ instance: Inst }>>
  open(u: string): Promise<void>
}
interface Window { tank?: { platform: string; update: { state(): Promise<Rr<{ state: UpdateState }>>; check(): Promise<Rr<{ state: UpdateState }>>; download(): Promise<Rr<{ state: UpdateState }>>; apply(): Promise<Rr>; notes(): Promise<Rr>; onState(cb: (s: UpdateState) => void): () => void }; downloads: { list(): Promise<Rr<{ tasks: DlTask[] }>>; cancel(id: string): Promise<Rr<{ cancelled: boolean }>>; clear(): Promise<Rr>; onUpdate(cb: (t: DlTask[]) => void): () => void }; stats: { get(): Promise<Rr<{ stats: PlayStats }>> }; news: { get(): Promise<Rr<{ news: NewsItem[] }>> }; mods: ModsApi; servers: {
  list(): Promise<SrvEntry[]>; save(l: SrvEntry[]): Promise<SrvEntry[]>; ping(address: string): Promise<PingRes> }; settings: {
  get(): Promise<{ settings: AppSettings; maxRamMb: number; defaultGameDir: string }>
  set(s: AppSettings): Promise<AppSettings>
  pick(kind: 'java' | 'folder'): Promise<string | null> }; game: {
  versions(): Promise<{ ok: true; versions: string[] } | { ok: false; error: string }>
  play(id: string, address?: string, profileId?: string): Promise<{ ok: boolean; error?: string }>
  onProgress(cb: (p: { text: string; pct: number }) => void): () => void
  onState(cb: (s: { state: string; message?: string }) => void): () => void }; auth: {
  restore(): Promise<AuthResult>; login(): Promise<AuthResult>; cancel(): Promise<void>; logout(): Promise<void>
  onCode(cb: (c: { userCode: string; url: string }) => void): () => void
  onStep(cb: (t: string) => void): () => void } } }
