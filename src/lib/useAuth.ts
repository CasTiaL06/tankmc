import { useEffect, useState } from 'react'

export interface Auth {
  user: { name: string; uuid: string } | null
  flow: { step: string; code?: { userCode: string; url: string } } | null
  login(): Promise<void>; logout(): Promise<void>; cancel(): void
}
// Giriş durumu uygulama düzeyinde: kenar çubuğu ve Oyuncu sayfası aynı oturumu kullanır.
export function useAuth(toast: (m: string) => void): Auth {
  const api = window.tank?.auth
  const [user, setUser] = useState<Auth['user']>(null), [flow, setFlow] = useState<Auth['flow']>(null)
  useEffect(() => {
    if (!api) return
    api.restore().then(r => { if (r.ok) setUser(r.user); else if (r.error) toast(r.error) }).catch(() => {})
    const offs = [api.onCode(c => setFlow(f => ({ step: f?.step ?? '', code: c }))), api.onStep(t => setFlow(f => (f ? { ...f, step: t } : f)))]
    return () => offs.forEach(f => f())
  }, [])
  return {
    user, flow,
    login: async () => {
      if (!api) return toast('Microsoft girişi yalnızca masaüstü uygulamasında çalışır.')
      if (flow) return
      setFlow({ step: 'Başlatılıyor…' }) // tıklanır tıklanmaz pencere açılır: "hiçbir şey olmuyor" durumu olmaz
      const r = await api.login(); setFlow(null)
      if (r.ok) { setUser(r.user); toast('Hoş geldin, ' + r.user.name) } else if (r.error !== 'cancel') toast(r.error)
    },
    logout: async () => { await api?.logout(); setUser(null) },
    cancel: () => { setFlow(null); void api?.cancel() },
  }
}
