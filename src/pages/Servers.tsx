import { useMemo, useState } from 'react'
import { SERVERS } from '../data'
import { scene } from '../lib/scene'

export default function Servers({ toast }: { toast: (m: string) => void }) {
  const [q, setQ] = useState(''), [onlyFav, setOnlyFav] = useState(false), [fav, setFav] = useState<Set<number>>(new Set([12]))
  const art = useMemo(() => Object.fromEntries(SERVERS.map(s => [s.id, scene(s.id, s.k)])), [])
  const L = SERVERS.filter(s => (!onlyFav || fav.has(s.id)) && (s.n + s.ip).toLowerCase().includes(q.toLowerCase())).sort((a, b) => +fav.has(b.id) - +fav.has(a.id))
  const flip = (id: number) => setFav(f => { const n = new Set(f); n.has(id) ? n.delete(id) : n.add(id); return n })
  return (
    <section className="view on">
      <h1>Sunucular</h1><p className="sub">Topluluk sunucuları · örnek veriler</p>
      <div className="tools">
        <label className="srch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></svg><input value={q} onChange={e => setQ(e.target.value)} placeholder="Sunucu ara…" /></label>
        <button className={'fc' + (!onlyFav ? ' on' : '')} onClick={() => setOnlyFav(false)}>Tümü</button>
        <button className={'fc' + (onlyFav ? ' on' : '')} onClick={() => setOnlyFav(true)}>★ Favoriler</button>
      </div>
      <div className="grid">{L.length ? L.map(s => (
        <div className="card sv" key={s.id}>
          <button className={'fav' + (fav.has(s.id) ? ' on' : '')} onClick={() => flip(s.id)}>★</button>
          <div className="si" dangerouslySetInnerHTML={{ __html: art[s.id] }} />
          <div className="cb"><h3>{s.n}</h3><p>{s.d}</p>
            <div className="meta"><span className={s.on ? 'on-d' : ''}>{s.on ? `● Çevrimiçi · ${s.p}/${s.mx}` : '○ Çevrimdışı'} · {s.v}</span>
              <button className="btn" disabled={!s.on} style={s.on ? undefined : { opacity: .4 }} onClick={() => toast(`${s.n}: katılma, Minecraft başlatma aşamasında bağlanacak.`)}>KATIL</button></div></div>
        </div>)) : <div className="empty">Gösterilecek sunucu yok.</div>}</div>
    </section>
  )
}
