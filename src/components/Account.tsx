import { useEffect, useState } from 'react'

export default function Account({ toast }: { toast: (m: string) => void }) {
  const [u, setU] = useState<{ name: string; uuid: string } | null>(null)
  const [code, setCode] = useState<{ userCode: string; url: string } | null>(null)
  const api = window.tank?.auth
  useEffect(() => {
    api?.restore().then(r => { if (r.ok) setU(r.user); else if (r.error) toast(r.error) }).catch(() => {})
    return api?.onCode(setCode)
  }, [])
  const login = async () => {
    if (!api) return toast('Microsoft girişi yalnızca masaüstü uygulamasında çalışır.')
    const r = await api.login(); setCode(null)
    if (r.ok) { setU(r.user); toast('Hoş geldin, ' + r.user.name) } else if (r.error !== 'cancel') toast(r.error)
  }
  const logout = async () => { await api?.logout(); setU(null) }
  return (<>
    <div className="me">
      <div className="av">{u ? <img alt="" src={`https://crafatar.com/avatars/${u.uuid}?size=64&overlay`} /> : <svg viewBox="0 0 8 8" shapeRendering="crispEdges"><rect width="8" height="8" fill="#3a3d44" /><rect x="3" y="2" width="2" height="2" fill="#8c9097" /><rect x="2" y="5" width="4" height="3" fill="#8c9097" /></svg>}</div>
      <div style={{ flex: 1, minWidth: 0 }}><b>{u ? u.name : 'Oyuncu'}</b>
        {u ? <small><span className="pd" />Java Edition sahibi · <a className="lnk" onClick={logout}>Çıkış</a></small>
          : <small><a className="lnk" onClick={login}>Microsoft ile giriş yap</a></small>}</div>
    </div>
    {code && <div className="ov"><div className="mdl"><h3>Microsoft ile giriş</h3>
      <p>Tarayıcı açıldı. Açılmadıysa <b>{code.url}</b> adresine git ve bu kodu gir:</p>
      <div className="code" onClick={() => navigator.clipboard?.writeText(code.userCode)} title="Kopyala">{code.userCode}</div>
      <p className="st">Giriş tamamlanana kadar bekleniyor…</p>
      <button className="btn g" onClick={() => window.tank?.auth.cancel()}>İptal</button></div></div>}
  </>)
}
