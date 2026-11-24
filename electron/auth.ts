import { app, safeStorage, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { CLIENT_ID } from './config'

const MS = 'https://login.microsoftonline.com/consumers/oauth2/v2.0'
const SCOPE = 'XboxLive.signin offline_access'
interface Session { name: string; uuid: string; mcToken: string; mcExpires: number; refresh: string }
export interface PublicUser { name: string; uuid: string }
let cur: Session | null = null, cancelled = false
const file = () => path.join(app.getPath('userData'), 'session.bin')
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const pub = (s: Session): PublicUser => ({ name: s.name, uuid: s.uuid })

async function call(url: string, init: RequestInit) {
  const r = await fetch(url, init)
  const t: any = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(t.error_description || t.error || t.Message || 'HTTP ' + r.status), { data: t, status: r.status })
  return t
}
const form = (url: string, b: Record<string, string>) => call(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(b) })
const json = (url: string, b: unknown) => call(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(b) })

export function friendly(e: unknown): string {
  const x = e as any, c = x?.data?.XErr
  if (x?.message === 'cancel') return 'cancel'
  if (c === 2148916233) return 'Bu Microsoft hesabına bağlı bir Xbox profili yok. Önce xbox.com üzerinden oluşturun.'
  if (c === 2148916238) return 'Bu hesap 18 yaş altı; Microsoft aile ayarlarından izin verilmesi gerekiyor.'
  if (x?.status === 404) return 'Bu hesapta Minecraft Java Edition bulunamadı.'
  if (x?.status === 403) return 'Bu Azure uygulaması Minecraft servisleri için henüz onaylı değil (aka.ms/AppRegReview).'
  return x?.message ?? 'Bilinmeyen giriş hatası.'
}

async function finish(t: any): Promise<PublicUser> {
  const xbl = await json('https://user.auth.xboxlive.com/user/authenticate', { Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: 'd=' + t.access_token }, RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT' })
  const xsts = await json('https://xsts.auth.xboxlive.com/xsts/authorize', { Properties: { SandboxId: 'RETAIL', UserTokens: [xbl.Token] }, RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT' })
  const mc = await json('https://api.minecraftservices.com/authentication/login_with_xbox', { identityToken: `XBL3.0 x=${xsts.DisplayClaims.xui[0].uhs};${xsts.Token}` })
  const prof = await call('https://api.minecraftservices.com/minecraft/profile', { headers: { Authorization: 'Bearer ' + mc.access_token } })
  cur = { name: prof.name, uuid: prof.id, mcToken: mc.access_token, mcExpires: Date.now() + mc.expires_in * 1000, refresh: t.refresh_token }
  // Oturum yalnızca işletim sistemi şifrelemesi (DPAPI) varsa diske yazılır; yoksa sadece bellekte tutulur.
  if (safeStorage.isEncryptionAvailable()) fs.writeFileSync(file(), safeStorage.encryptString(JSON.stringify(cur)))
  return pub(cur)
}

export async function login(onCode: (c: { userCode: string; url: string }) => void): Promise<PublicUser> {
  if (!CLIENT_ID) throw new Error('Azure Client ID tanımlı değil (README’deki adımlara bak).')
  cancelled = false
  const dc = await form(MS + '/devicecode', { client_id: CLIENT_ID, scope: SCOPE })
  onCode({ userCode: dc.user_code, url: dc.verification_uri })
  shell.openExternal(dc.verification_uri)
  let wait = (dc.interval || 5) * 1000
  const end = Date.now() + dc.expires_in * 1000
  while (Date.now() < end) {
    await sleep(wait)
    if (cancelled) throw new Error('cancel')
    try { return await finish(await form(MS + '/token', { grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: CLIENT_ID, device_code: dc.device_code })) }
    catch (e) { const c = (e as any).data?.error; if (c === 'authorization_pending') continue; if (c === 'slow_down') { wait += 5000; continue } throw e }
  }
  throw new Error('Giriş süresi doldu.')
}
export const cancelLogin = () => { cancelled = true }

export async function restore(): Promise<PublicUser | null> {
  try {
    if (!CLIENT_ID || !fs.existsSync(file())) return null
    const s: Session = JSON.parse(safeStorage.decryptString(fs.readFileSync(file())))
    if (s.mcExpires > Date.now() + 60000) { cur = s; return pub(s) }
    return await finish(await form(MS + '/token', { grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: s.refresh, scope: SCOPE }))
  } catch { return null }
}
export function logout() { cur = null; try { fs.rmSync(file(), { force: true }) } catch { /* yok say */ } }
export const getSession = () => cur // Aşama 4'te oyun başlatma buradan token alacak
