import { useState } from 'react'
import type { Auth } from '../lib/useAuth'
import Skin from './Skin'

const STEVE = <svg viewBox="0 0 8 8" shapeRendering="crispEdges"><rect width="8" height="8" fill="#3a3d44" /><rect x="3" y="2" width="2" height="2" fill="#8c9097" /><rect x="2" y="5" width="4" height="3" fill="#8c9097" /></svg>

export default function Account({ auth }: { auth: Auth }) {
  const { user: u, flow, accounts: acc, skin } = auth
  const [open, setOpen] = useState(false), [name, setName] = useState(''), [err, setErr] = useState('')
  const off = acc.active === 'ms' ? undefined : acc.offline.find(o => o.id === acc.active)
  const msHead = u ? <Skin skin={skin} mode="head" scale={6} className="pi" fallback={<img alt="" className="pi" src={`https://mc-heads.net/avatar/${u.uuid}/64`} />} /> : STEVE
  return (<>
    <div className="me" onClick={() => setOpen(o => !o)}>
      <div className="av">{off ? STEVE : msHead}</div>
      <div style={{ flex: 1, minWidth: 0 }}><b>{off ? off.name : u ? u.name : 'Oyuncu'}</b>
        <small>{off ? 'Çevrimdışı hesap' : u ? <><span className="pd" />Java Edition sahibi</> : <a className="lnk" onClick={e => { e.stopPropagation(); void auth.login() }}>Microsoft ile giriş yap</a>}</small></div>
      <span className="chv">▾</span>
    </div>
    {open && <>
      <div className="pclose" onClick={() => setOpen(false)} />
      <div className="pop accp" onClick={e => e.stopPropagation()}>
        <h5>Hesaplar</h5>
        <div className={'ai' + (acc.active === 'ms' ? ' on' : '')} onClick={() => u && void auth.select('ms')}>
          <div className="av s">{msHead}</div><div className="at"><b>{u ? u.name : 'Microsoft hesabı'}</b><small>{u ? 'Java Edition sahibi' : <a className="lnk" onClick={() => void auth.login()}>Giriş yap</a>}</small></div>
          {u && <a className="lnk" onClick={e => { e.stopPropagation(); void auth.logout() }}>Çıkış</a>}
        </div>
        {acc.offline.map(o => (
          <div key={o.id} className={'ai' + (acc.active === o.id ? ' on' : '') + (u ? '' : ' dis')} onClick={() => void auth.select(o.id)}>
            <div className="av s">{STEVE}</div><div className="at"><b>{o.name}</b><small>Çevrimdışı</small></div>
            <a className="lnk" title="Sil" onClick={e => { e.stopPropagation(); if (confirm(`“${o.name}” çevrimdışı hesabı silinsin mi?`)) void auth.removeOffline(o.id) }}>✕</a>
          </div>))}
        <form className="addoff" onSubmit={async e => { e.preventDefault(); const er = await auth.addOffline(name.trim()); if (er) setErr(er); else { setErr(''); setName('') } }}>
          <input className="fi" placeholder="Çevrimdışı kullanıcı adı" maxLength={16} value={name} onChange={e => setName(e.target.value)} />
          <button className="btn" style={{ minWidth: 0 }} disabled={!u || !name.trim()}>EKLE</button>
        </form>
        {!u && <p className="st">Çevrimdışı hesap eklemek için önce Microsoft ile giriş yap.</p>}
        {err && <p className="st" style={{ color: '#ff6b6b' }}>{err}</p>}
        <p className="st">Çevrimdışı hesaplar yalnızca tek oyunculu ve çevrimdışı moddaki sunucularda çalışır; Minecraft sahibi bir Microsoft hesabı bağlıyken kullanılabilir.</p>
      </div>
    </>}
    {flow && <div className="ov"><div className="mdl"><h3>Microsoft ile giriş</h3>
      {flow.code ? <>
        <p>Tarayıcı açıldı. Açılmadıysa <b>{flow.code.url}</b> adresine git ve bu kodu gir:</p>
        <div className="code" title="Kopyala" onClick={() => navigator.clipboard?.writeText(flow.code!.userCode)}>{flow.code.userCode}</div></> : <div className="spin" />}
      <p className="st">{flow.step}</p>
      <button className="btn g" onClick={auth.cancel}>İptal</button></div></div>}
  </>)
}
