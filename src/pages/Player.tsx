import { useEffect, useState } from 'react'
import type { Auth } from '../lib/useAuth'

const dur = (ms: number) => { const m = Math.round(ms / 60000); return m < 60 ? `${m} dk` : `${Math.floor(m / 60)} sa ${m % 60} dk` }
const when = (t: number) => new Date(t).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

export default function Player({ auth }: { auth: Auth }) {
  const u = auth.user
  const [st, setSt] = useState<PlayStats | null>(null)
  useEffect(() => { window.tank?.stats.get().then(r => { if (r.ok) setSt(r.stats) }) }, [])
  return (
    <section className="view on">
      <h1>Oyuncu</h1><p className="sub">Hesabın ve TankClient ile oynadığın oyunlar</p>
      <div className="pl">
        <div className="skin">
          {u ? <img className="body" alt="" src={`https://mc-heads.net/body/${u.uuid}/220`} onError={e => { const i = e.currentTarget; if (!i.dataset.fb) { i.dataset.fb = '1'; i.src = `https://crafatar.com/renders/body/${u.uuid}?scale=5&overlay` } }} />
            : <div className="body ghost">?</div>}
          <div className="pname">{u ? u.name : 'Giriş yapılmadı'}</div>
          {u ? <>
            <span className="st">Minecraft: Java Edition sahibi ✓</span>
            <span className="uuid" title="Kopyala" onClick={() => navigator.clipboard?.writeText(u.uuid)}>{u.uuid}</span>
            <button className="btn g" onClick={() => void auth.logout()}>ÇIKIŞ YAP</button></>
            : <button className="btn" onClick={() => void auth.login()}>MICROSOFT İLE GİRİŞ YAP</button>}
        </div>
        <div>
          <div className="tiles">
            <div className="tile"><b>{st ? dur(st.totalMs) : '—'}</b><span>Toplam oyun süresi</span></div>
            <div className="tile"><b>{st ? st.count : '—'}</b><span>Oyun oturumu</span></div>
            <div className="tile"><b style={{ fontSize: 16 }}>{st?.top ? st.top.label : '—'}</b><span>En çok oynanan</span></div>
          </div>
          <h2 className="sec">Oyun geçmişi</h2>
          {st && !st.recent.length && <div className="empty">Henüz oyun kaydı yok. TankClient ile oynadıkça burada görünür.</div>}
          {st?.recent.map(s => <div className="mrow" key={s.start} style={{ cursor: 'default' }}><div className="mt"><b>{s.label}</b><span>{when(s.start)}</span></div><span className="st">{dur(s.end - s.start)}</span></div>)}
          <p className="notice" style={{ marginTop: 14 }}>Süreler yalnızca TankClient’in başlattığı oyunlardan hesaplanır; 5 saniyeden kısa oturumlar ve TankClient kapalıyken oynananlar sayılmaz.</p>
        </div>
      </div>
    </section>
  )
}
