import { useState } from 'react'
import type { Page } from '../lib/nav'

export interface Notice { id: string; text: string; page: Page }
const I = (d: string) => <svg viewBox="0 0 24 24"><path d={d} /></svg>
// Özel başlık çubuğu: arama, bildirimler ve pencere denetimleri (pencere çerçevesiz)
export default function TopBar({ onSearch, notices, go }: { onSearch: (q: string) => void; notices: Notice[]; go: (p: Page) => void }) {
  const [q, setQ] = useState(''), [open, setOpen] = useState(false), w = window.tank?.win
  return (
    <header className="top">
      <form className="gs" onSubmit={e => { e.preventDefault(); if (q.trim()) { onSearch(q.trim()); setQ('') } }}>
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></svg>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Mod ara… (Enter)" />
      </form>
      <span className="sp" />
      <div style={{ position: 'relative' }}>
        <button className="ib" title="Bildirimler" onClick={() => setOpen(o => !o)}>{I('M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0')}{notices.length > 0 && <i className="dotb" />}</button>
        {open && <><div className="pclose" onClick={() => setOpen(false)} /><div className="pop bellp">
          <h5>Bildirimler</h5>
          {!notices.length && <p className="st" style={{ margin: 0 }}>Yeni bildirim yok.</p>}
          {notices.map(n => <button key={n.id} className="it" onClick={() => { go(n.page); setOpen(false) }}>{n.text}</button>)}
        </div></>}
      </div>
      <span className="vsep" />
      <button className="ib" title="Küçült" onClick={() => void w?.min()}>{I('M5 12h14')}</button>
      <button className="ib" title="Büyüt / geri al" onClick={() => void w?.max()}>{I('M5 5h14v14H5z')}</button>
      <button className="ib x" title="Kapat" onClick={() => void w?.close()}>{I('M6 6l12 12M18 6L6 18')}</button>
    </header>
  )
}
