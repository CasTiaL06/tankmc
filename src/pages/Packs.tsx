import { useMemo, useState } from 'react'
import { PACKS, Pack } from '../data'
import { scene } from '../lib/scene'

const CATS = ['Tümü', ...Array.from(new Set(PACKS.map(p => p.c)))]

function Card({ p, st, onClick }: { p: Pack; st?: number; onClick: () => void }) {
  const art = useMemo(() => scene(p.s, p.k), [p])
  return (
    <div className="card">
      <div className="cv"><span className="ld">{p.l}</span><div style={{ height: '100%' }} dangerouslySetInnerHTML={{ __html: art }} /></div>
      <div className="cb"><h3>{p.n}</h3><p>{p.d}</p>
        <div className="meta"><div className="chips"><span>MC {p.v}</span><span>{p.m} mod</span><span>{p.c}</span></div>
          {st === 100 ? <button className="btn ok" onClick={onClick}>KURULU ✓</button>
            : st != null ? <button className="btn g">%{st}<i style={{ width: st + '%' }} /></button>
            : <button className="btn" onClick={onClick}>KUR</button>}
        </div></div>
    </div>
  )
}

export default function Packs({ toast }: { toast: (m: string) => void }) {
  const [q, setQ] = useState(''), [cat, setCat] = useState('Tümü'), [inst, setInst] = useState<Record<number, number>>({})
  const L = PACKS.filter(p => (cat === 'Tümü' || p.c === cat) && (p.n + p.d + p.l + p.c).toLowerCase().includes(q.toLowerCase().trim()))
  const filtered = q.trim() !== '' || cat !== 'Tümü'
  const click = (id: number) => {
    if (inst[id] === 100) { setInst(({ [id]: _, ...r }) => r); toast('Mod paketi kaldırıldı.'); return }
    setInst(s => ({ ...s, [id]: 0 }))
    const t = setInterval(() => setInst(s => { const v = Math.min(100, (s[id] ?? 0) + 5); if (v >= 100) clearInterval(t); return { ...s, [id]: v } }), 90)
  }
  const grid = (arr: Pack[], big = false) => <div className={'grid' + (big ? ' big' : '')}>{arr.map(p => <Card key={p.id} p={p} st={inst[p.id]} onClick={() => click(p.id)} />)}</div>
  return (
    <section className="view on">
      <h1>Mod Paketleri</h1><p className="sub">Tek tıkla kurulum · örnek katalog</p>
      <div className="tools">
        <label className="srch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></svg><input value={q} onChange={e => setQ(e.target.value)} placeholder="Mod paketi ara…" /></label>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{CATS.map(c => <button key={c} className={'fc' + (c === cat ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}</span>
      </div>
      {filtered ? <><h2 className="sec">Sonuçlar ({L.length})</h2>{L.length ? grid(L) : <div className="empty">Eşleşen mod paketi bulunamadı.</div>}</>
        : <><h2 className="sec">Öne çıkanlar</h2>{grid(PACKS.filter(p => p.f), true)}<h2 className="sec">Son eklenenler</h2>{grid(PACKS.filter(p => !p.f))}</>}
    </section>
  )
}
