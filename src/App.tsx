import { useEffect, useMemo, useRef, useState } from 'react'
import { isoHero } from './lib/scene'
import ModLibrary from './pages/ModLibrary'
import Servers from './pages/Servers'
import Settings from './pages/Settings'
import Account from './components/Account'
import ProfileIcon from './components/ProfileIcon'
import NewProfile from './components/NewProfile'
import Library from './pages/Library'
import { useProfiles } from './lib/useProfiles'
import { useGame, Game } from './lib/useGame'

const ICONS: Record<string, string> = {
  library: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7M17.5 14v7"/>',
  home: '<path d="M3 11l9-8 9 8v10H3z"/><path d="M9 21v-7h6v7"/>',
  servers: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/>',
  packs: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
}
const NAV = [['home', 'Ana Sayfa'], ['library', 'Kütüphane'], ['servers', 'Sunucular'], ['packs', 'Mod Kütüphanesi'], ['settings', 'Ayarlar']] as const
type Page = typeof NAV[number][0]

// Ana sayfa: Modrinth'in gerçek en çok indirilen modları (çevrimdışıysa gösterilmez)
function Featured({ go }: { go: (p: Page) => void }) {
  const api = window.tank?.mods
  const [hits, setHits] = useState<ModHit[]>([])
  useEffect(() => { api?.search({ query: '', type: 'mod', sort: 'downloads' }).then(r => { if (r.ok) setHits(r.hits.slice(0, 3)) }) }, [])
  if (!hits.length) return null
  return (<>
    <h2 className="sec">Popüler modlar</h2>
    <div className="grid">{hits.map(h => (
      <div className="card" key={h.id}><div className="cv"><span className="ld">{h.loaders[0] ?? 'Mod'}</span>{(h.cover ?? h.icon) && <img alt="" src={(h.cover ?? h.icon) as string} />}</div>
        <div className="cb"><h3>{h.title}</h3><p>{h.desc}</p><div className="meta"><div className="chips"><span>⬇ {new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(h.downloads)}</span><span>{h.author}</span></div><button className="btn g" onClick={() => go('packs')}>Kütüphane</button></div></div></div>))}</div>
  </>)
}

// Mojang'ın resmî sürüm notları (çevrimdışıysa veya alınamazsa bölüm gösterilmez)
function News() {
  const api = window.tank?.news
  const [items, setItems] = useState<NewsItem[]>([])
  useEffect(() => { api?.get().then(r => { if (r.ok) setItems(r.news) }) }, [])
  if (!items.length) return null
  return (<>
    <h2 className="sec">Minecraft haberleri</h2>
    <div className="grid">{items.map(n => (
      <div className="card" key={n.version + n.title}><div className="cv"><span className="ld">Sürüm {n.version}</span>{n.image && <img alt="" src={n.image} />}</div>
        <div className="cb"><h3>{n.title}</h3><p>{n.text}</p><div className="meta"><span>{n.date ?? ''}</span></div></div></div>))}</div>
  </>)
}

function Home({ go, g }: { go: (p: Page) => void; g: Game }) {
  const [ldr, setLdr] = useState('Vanilla')
  const iso = useMemo(isoHero, [])
  return (
    <section className="view on">
      <div className="hero">
        <svg className="iso" viewBox="0 0 520 340" preserveAspectRatio="xMidYMid slice" dangerouslySetInnerHTML={{ __html: iso }} />
        <div className="hc"><span className="tag">MINECRAFT JAVA LAUNCHER</span><h2>Blokları <b>sen</b> yönet.</h2>
          <div className="last">Son oynanan: <b>{g.last ?? 'Henüz oynanmadı'}</b></div>
          <div className="row">
            <button className="play" onClick={() => void g.play()} disabled={g.busy}><svg viewBox="0 0 24 24"><path d="M6 3l15 9-15 9z" /></svg>{g.live ? 'OYUN AÇIK' : g.busy ? 'HAZIRLANIYOR' : 'OYNA'}</button>
            <select value={g.ver} onChange={e => g.setVer(e.target.value)} disabled={g.busy}>{g.vers.length ? g.vers.map(v => <option key={v}>{v}</option>) : <option>{window.tank ? 'Sürümler yükleniyor…' : 'Sürüm yok'}</option>}</select>
            <select value={ldr} onChange={e => setLdr(e.target.value)}>{['Vanilla', 'Fabric', 'Forge', 'NeoForge'].map(v => <option key={v} disabled={v !== 'Vanilla'}>{v}{v !== 'Vanilla' ? ' (yakında)' : ''}</option>)}</select>
          </div>
          <div className={'bar' + (g.prog ? ' on' : '')}><i style={{ width: (g.prog ? g.prog.pct * 100 : 0) + '%' }} /></div>
          <div className="st">{g.prog?.text}</div>
        </div>
      </div>
      <Featured go={go} />
      <News />
    </section>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('home'), [msg, setMsg] = useState(''), tm = useRef<number>()
  const toast = (m: string) => { setMsg(m); clearTimeout(tm.current); tm.current = window.setTimeout(() => setMsg(''), 3200) }
  useEffect(() => () => clearTimeout(tm.current), [])
  const g = useGame(toast)
  const p = useProfiles(), [newP, setNewP] = useState(false)
  const idx = NAV.findIndex(n => n[0] === page)
  return (
    <div className="app">
      <aside>
        <div className="brand"><svg width="36" height="36" viewBox="0 0 40 40"><path d="M20 2l16 9v18l-16 9L4 29V11z" fill="#18191c" stroke="#ff6a1a" strokeWidth="2.5" /><path d="M11 14h18v5h-6.5v11h-5V19H11z" fill="#ff6a1a" /></svg><span>Tank<b>Client</b></span></div>
        <nav><div className="ind" style={{ transform: `translateY(${idx * 48}px)` }} />
          {NAV.map(([k, n]) => <button key={k} className={k === page ? 'on' : ''} onClick={() => setPage(k)}><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICONS[k] }} />{n}</button>)}</nav>
        <div className="profs">
          <h4>Profiller</h4>
          <div className="ptiles">
            {(p.insts ?? []).map(i => <button key={i.id} className={'pt' + (i.id === p.selId ? ' on' : '')} title={`${i.name} · ${i.loader} ${i.mc}`} onClick={() => { p.setSelId(i.id); setPage('library') }}><ProfileIcon p={i} /></button>)}
            <button className="pt add" title="Yeni profil" onClick={() => setNewP(true)}>+</button>
          </div>
        </div>
        <Account toast={toast} />
      </aside>
      <main key={page}>
        {page === 'home' && <Home go={setPage} g={g} />}
        {page === 'library' && <Library toast={toast} g={g} p={p} go={setPage} />}
        {page === 'servers' && <Servers toast={toast} g={g} />}
        {page === 'packs' && <ModLibrary toast={toast} g={g} p={p} />}
        {page === 'settings' && <Settings />}
      </main>
      {newP && <NewProfile vers={g.vers} onCreate={(n, m, l) => { void p.create(n, m, l).then(e => { if (e) toast(e); else { setNewP(false); setPage('library') } }) }} onClose={() => setNewP(false)} />}
      <div id="toast" className={msg ? 'on' : ''}>{msg}</div>
    </div>
  )
}
