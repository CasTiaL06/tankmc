import { app, safeStorage, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { CLIENT_ID } from './config'

const MS = 'https://login.microsoftonline.com/consumers/oauth2/v2.0'
const SCOPE = 'XboxLive.signin offline_access'
export interface Session { name: string; uuid: string; mcToken: string; mcExpires: number; refresh: string; skinUrl?: string | null; slim?: boolean }
export interface PublicUser { name: string; uuid: string }
let cur: Session | null = null, cancelled = false
const file = () => path.join(app.getPath('userData'), 'session.bin')
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const SKIN_URL = /^https:\/\/textures\.minecraft\.net\/texture\/[0-9a-f]{16,80}$/
// Etkin skin: kimlik doğrulamalı Minecraft profilinden (üçüncü taraf servis yok); adres yalnızca resmî doku sunucusundan kabul edilir
function skinOf(prof: any): { url: string | null; slim: boolean } {
  const sk = ((prof?.skins ?? []) as any[]).find(x => x?.state === 'ACTIVE'), u = typeof sk?.url === 'string' ? sk.url.replace(/^http:/, 'https:') : ''
  return { url: SKIN_URL.test(u) ? u : null, slim: sk?.variant === 'SLIM' }
}
const pub = (s: Session): PublicUser => ({ name: s.name, uuid: s.uuid })
// Giriş adımları logs/auth.log dosyasına yazılır (belirteç/şifre asla yazılmaz); sorun giderme için.
function log(m: string) {
  try {
    const d = path.join(app.getPath('userData'), 'logs'), f = path.join(d, 'auth.log'); fs.mkdirSync(d, { recursive: true })
    if (fs.existsSync(f) && fs.statSync(f).size > 500_000) fs.rmSync(f)
    fs.appendFileSync(f, `${new Date().toISOString()} ${m}\n`)
  } catch { /* günlük yazılamadı */ }
}

async function call(url: string, init: RequestInit) {
  const u = new URL(url); let r: Response
  try { r = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) }) }
  catch (e) {
    const x = e as Error; log(`AĞ HATASI ${u.hostname}: ${x.name} ${x.message}`)
    throw new Error(`${u.hostname} ${x.name === 'TimeoutError' ? 'zaman aşımına uğradı' : 'adresine bağlanılamadı'}. İnternet bağlantını, güvenlik duvarını veya VPN/proxy ayarlarını kontrol et.`)
  }
  const t: any = await r.json().catch(() => ({}))
  if (!r.ok) {
    log(`HTTP ${r.status} ${u.hostname}${u.pathname} ${t.error ?? ''} ${t.XErr ?? ''} ${String(t.error_description ?? t.Message ?? t.errorMessage ?? '').replace(/\s+/g, ' ').slice(0, 200)}`)
    throw Object.assign(new Error(t.error_description || t.error || t.Message || 'HTTP ' + r.status), { data: t, status: r.status })
  }
  return t
}
const form = (url: string, b: Record<string, string>) => call(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(b) })
const json = (url: string, b: unknown) => call(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(b) })

export function friendly(e: unknown): string {
  const x = e as any, c = x?.data?.XErr
  if (x?.message === 'cancel') return 'cancel'
  const d: string = x?.data?.error_description ?? ''
  if (d.includes('AADSTS7000218')) return 'Azure uygulamasında “Allow public client flows” kapalı. Azure → Authentication → Yes yapıp kaydet.'
  if (d.includes('AADSTS700016') || d.includes('AADSTS50020') || x?.data?.error === 'unauthorized_client') return 'Azure uygulaması kişisel Microsoft hesaplarına açık değil. Azure → Authentication → Supported account types ayarına “Personal Microsoft accounts” ekle.'
  if (c === 2148916233) return 'Bu Microsoft hesabına bağlı bir Xbox profili yok. Önce xbox.com üzerinden oluşturun.'
  if (c === 2148916238) return 'Bu hesap 18 yaş altı; Microsoft aile ayarlarından izin verilmesi gerekiyor.'
  if (x?.status === 404) return 'Bu hesapta Minecraft Java Edition bulunamadı.'
  if (x?.status === 403) return 'Bu Azure uygulaması Minecraft servisleri için henüz onaylı değil (aka.ms/AppRegReview).'
  return x?.message ?? 'Bilinmeyen giriş hatası.'
}

async function finish(t: any, step: (s: string) => void = () => {}): Promise<PublicUser> {
  step('Xbox Live hesabı doğrulanıyor…'); log('Xbox Live')
  const xbl = await json('https://user.auth.xboxlive.com/user/authenticate', { Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: 'd=' + t.access_token }, RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT' })
  step('Xbox güvenlik belirteci alınıyor…'); log('XSTS')
  const xsts = await json('https://xsts.auth.xboxlive.com/xsts/authorize', { Properties: { SandboxId: 'RETAIL', UserTokens: [xbl.Token] }, RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT' })
  step('Minecraft’a giriş yapılıyor…'); log('Minecraft login_with_xbox')
  const mc = await json('https://api.minecraftservices.com/authentication/login_with_xbox', { identityToken: `XBL3.0 x=${xsts.DisplayClaims.xui[0].uhs};${xsts.Token}` })
  step('Minecraft sahipliği ve profil kontrol ediliyor…'); log('Minecraft profil')
  const prof = await call('https://api.minecraftservices.com/minecraft/profile', { headers: { Authorization: 'Bearer ' + mc.access_token } })
  const sk = skinOf(prof)
  cur = { name: prof.name, uuid: prof.id, mcToken: mc.access_token, mcExpires: Date.now() + mc.expires_in * 1000, refresh: t.refresh_token, skinUrl: sk.url, slim: sk.slim }
  log('Giriş başarılı: ' + prof.name)
  // Oturum yalnızca işletim sistemi şifrelemesi (DPAPI) varsa diske yazılır; yoksa sadece bellekte tutulur.
  if (safeStorage.isEncryptionAvailable()) fs.writeFileSync(file(), safeStorage.encryptString(JSON.stringify(cur)))
  return pub(cur)
}

let busy = false
export async function login(onCode: (c: { userCode: string; url: string }) => void, onStep: (t: string) => void = () => {}): Promise<PublicUser> {
  if (!CLIENT_ID) throw new Error('Azure Client ID tanımlı değil (README’deki adımlara bak).')
  if (busy) throw new Error('Giriş zaten sürüyor.')
  busy = true; cancelled = false
  try {
    log('Giriş başlatıldı'); onStep('Microsoft’a bağlanılıyor…')
    const dc = await form(MS + '/devicecode', { client_id: CLIENT_ID, scope: SCOPE })
    log('Cihaz kodu alındı'); onCode({ userCode: dc.user_code, url: dc.verification_uri }); onStep('Tarayıcıda kodu girmen bekleniyor…')
    if (/^https:\/\//.test(String(dc.verification_uri))) void shell.openExternal(dc.verification_uri)
    let wait = (dc.interval || 5) * 1000
    const end = Date.now() + dc.expires_in * 1000
    while (Date.now() < end) {
      await sleep(wait)
      if (cancelled) throw new Error('cancel')
      let tok: any
      try { tok = await form(MS + '/token', { grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: CLIENT_ID, device_code: dc.device_code }) }
      catch (e) { const c = (e as any).data?.error; if (c === 'authorization_pending') continue; if (c === 'slow_down') { wait += 5000; continue } throw e }
      log('Microsoft girişi tamamlandı'); return await finish(tok, onStep)
    }
    throw new Error('Giriş süresi doldu. Tekrar dene.')
  } catch (e) { if ((e as Error).message !== 'cancel') log('HATA: ' + (e as Error).message); throw e }
  finally { busy = false }
}
export const cancelLogin = () => { cancelled = true }

export async function restore(): Promise<{ user: PublicUser | null; notice?: string }> {
  if (!CLIENT_ID || !fs.existsSync(file())) return { user: null }
  let s: Session
  try { s = JSON.parse(safeStorage.decryptString(fs.readFileSync(file()))) }
  catch { return { user: null, notice: 'Kayıtlı oturum bu bilgisayarda açılamadı (oturum Windows hesabına bağlı şifrelenir). Lütfen Microsoft ile yeniden giriş yapın.' } }
  if (s.mcExpires > Date.now() + 60000) { cur = s; return { user: pub(s) } }
  try { return { user: await finish(await form(MS + '/token', { grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: s.refresh, scope: SCOPE })) } }
  catch { return { user: null } }
}
export function logout() { cur = null; try { fs.rmSync(file(), { force: true }) } catch { /* yok say */ } }
export const getSession = () => cur
// Oturum yoksa veya süresi dolmak üzereyse (yenileme belirteciyle) yeniler; yoksa null döner.
export async function ensureSession(): Promise<Session | null> {
  if (!cur || cur.mcExpires < Date.now() + 60000) await restore()
  return cur
}

let skinCache: { url: string; dataUrl: string } | null = null
// Oturumdaki hesabın etkin skin PNG'si (data URL). Eski oturumlarda skin bilgisi yoksa profil yeniden okunur.
export async function getSkin(): Promise<{ dataUrl: string; slim: boolean } | null> {
  const s = cur; if (!s) return null
  if (s.skinUrl === undefined) {
    try {
      const sk = skinOf(await call('https://api.minecraftservices.com/minecraft/profile', { headers: { Authorization: 'Bearer ' + s.mcToken } }))
      s.skinUrl = sk.url; s.slim = sk.slim
      if (safeStorage.isEncryptionAvailable()) fs.writeFileSync(file(), safeStorage.encryptString(JSON.stringify(s)))
    } catch { return null }
  }
  if (!s.skinUrl) return null
  if (skinCache?.url !== s.skinUrl) {
    try {
      const r = await fetch(s.skinUrl, { signal: AbortSignal.timeout(10000) }); if (!r.ok) return null
      const b = Buffer.from(await r.arrayBuffer()); if (b.length > 200_000) return null
      skinCache = { url: s.skinUrl, dataUrl: 'data:image/png;base64,' + b.toString('base64') }
    } catch { return null }
  }
  return { dataUrl: skinCache.dataUrl, slim: !!s.slim }
}
