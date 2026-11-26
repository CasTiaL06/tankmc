import type { Auth } from '../lib/useAuth'

export default function Account({ auth }: { auth: Auth }) {
  const { user: u, flow } = auth
  return (<>
    <div className="me">
      <div className="av">{u ? <img alt="" src={`https://crafatar.com/avatars/${u.uuid}?size=64&overlay`} onError={e => { const i = e.currentTarget; if (!i.dataset.fb) { i.dataset.fb = '1'; i.src = `https://mc-heads.net/avatar/${u.uuid}/64` } }} /> : <svg viewBox="0 0 8 8" shapeRendering="crispEdges"><rect width="8" height="8" fill="#3a3d44" /><rect x="3" y="2" width="2" height="2" fill="#8c9097" /><rect x="2" y="5" width="4" height="3" fill="#8c9097" /></svg>}</div>
      <div style={{ flex: 1, minWidth: 0 }}><b>{u ? u.name : 'Oyuncu'}</b>
        {u ? <small><span className="pd" />Java Edition sahibi · <a className="lnk" onClick={() => void auth.logout()}>Çıkış</a></small>
          : <small><a className="lnk" onClick={() => void auth.login()}>Microsoft ile giriş yap</a></small>}</div>
    </div>
    {flow && <div className="ov"><div className="mdl"><h3>Microsoft ile giriş</h3>
      {flow.code ? <>
        <p>Tarayıcı açıldı. Açılmadıysa <b>{flow.code.url}</b> adresine git ve bu kodu gir:</p>
        <div className="code" title="Kopyala" onClick={() => navigator.clipboard?.writeText(flow.code!.userCode)}>{flow.code.userCode}</div></> : <div className="spin" />}
      <p className="st">{flow.step}</p>
      <button className="btn g" onClick={auth.cancel}>İptal</button></div></div>}
  </>)
}
