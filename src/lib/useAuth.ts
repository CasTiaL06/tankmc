import { useEffect, useState } from 'react'

export interface Auth {
  user: { name: string; uuid: string } | null
  flow: { step: string; code?: { userCode: string; url: string } } | null
  skin: SkinData | null; accounts: AccountsState
  login(): Promise<void>; logout(): Promise<void>; cancel(): void
  addOffline(name: string): Promise<string | null>; removeOffline(id: string): Promise<void>; select(id: string): Promise<void>
}
const EMPTY: AccountsState = { offline: [], active: 'ms' }
// Giriş durumu uygulama düzeyinde: kenar çubuğu, Oyuncu sayfası ve alt çubuk aynı oturumu kullanır.
export function useAuth(toast: (m: string) => void): Auth {
  const api = window.tank?.auth, acc = window.tank?.acc
  const [user, setUser] = useState<Auth['user']>(null), [flow, setFlow] = useState<Auth['flow']>(null)
  const [skin, setSkin] = useState<SkinData | null>(null), [accounts, setAccounts] = useState<AccountsState>(EMPTY)
  useEffect(() => {
    acc?.list().then(r => { if (r.ok) setAccounts(r.accounts) })
    if (!api) return
    api.restore().then(r => { if (r.ok) setUser(r.user); else if (r.error) toast(r.error) }).catch(() => {})
    const offs = [api.onCode(c => setFlow(f => ({ step: f?.step ?? '', code: c }))), api.onStep(t => setFlow(f => (f ? { ...f, step: t } : f)))]
    return () => offs.forEach(f => f())
  }, [])
  useEffect(() => { setSkin(null); if (user) api?.skin().then(r => { if (r.ok) setSkin(r.skin) }) }, [user?.uuid])
  return {
    user, flow, skin, accounts,
    login: async () => {
      if (!api) return toast('Microsoft girişi yalnızca masaüstü uygulamasında çalışır.')
      if (flow) return
      setFlow({ step: 'Başlatılıyor…' }) // tıklanır tıklanmaz pencere açılır
      const r = await api.login(); setFlow(null)
      if (r.ok) { setUser(r.user); toast('Hoş geldin, ' + r.user.name) } else if (r.error !== 'cancel') toast(r.error)
    },
    logout: async () => { await api?.logout(); setUser(null) },
    cancel: () => { setFlow(null); void api?.cancel() },
    addOffline: async name => { if (!acc) return 'Yalnızca masaüstü uygulamasında kullanılabilir.'; const r = await acc.add(name); if (!r.ok) return r.error; setAccounts(r.accounts); return null },
    removeOffline: async id => { const r = await acc?.remove(id); if (r?.ok) setAccounts(r.accounts) },
    select: async id => { const r = await acc?.select(id); if (r?.ok) setAccounts(r.accounts); else if (r) toast(r.error) },
  }
}
