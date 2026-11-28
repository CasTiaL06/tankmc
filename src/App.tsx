import { useEffect, useRef, useState } from 'react'
import side from './assets/side.jpg'
import ModLibrary from './pages/ModLibrary'
import Servers from './pages/Servers'
import Settings from './pages/Settings'
import Player from './pages/Player'
import Downloads from './pages/Downloads'
import Library from './pages/Library'
import Home from './pages/Home'
import Account from './components/Account'
import TopBar, { Notice } from './components/TopBar'
import Dock from './components/Dock'
import RightRail from './components/RightRail'
import UpdateBanner from './components/UpdateBanner'
import ProfileIcon from './components/ProfileIcon'
import NewProfile from './components/NewProfile'
import { NAV, Page } from './lib/nav'
import { ICONS } from './lib/icons'
import { useUpdate } from './lib/useUpdate'
import { useDownloads } from './lib/useDownloads'
import { useAuth } from './lib/useAuth'
import { useProfiles } from './lib/useProfiles'
import { useGame } from './lib/useGame'
import { useTarget } from './lib/useTarget'

export default function App() {
  const [page, setPage] = useState<Page>('home'), [msg, setMsg] = useState(''), tm = useRef<number | undefined>(undefined)
  const [search, setSearch] = useState<{ q: string; n: number } | undefined>(undefined)
  const toast = (m: string) => { setMsg(m); clearTimeout(tm.current); tm.current = window.setTimeout(() => setMsg(''), Math.max(3200, m.length * 70)) }
  useEffect(() => () => clearTimeout(tm.current), [])
  const g = useGame(toast), auth = useAuth(toast), dl = useDownloads(), upd = useUpdate()
  const p = useProfiles(), [newP, setNewP] = useState(false), t = useTarget(g, p)
  useEffect(() => { document.body.classList.toggle('gaming', g.live) }, [g.live]) // oyun açıkken arayüz animasyonları durur (oyuna CPU/GPU kalsın)
  useEffect(() => { if (page !== 'packs') setSearch(undefined) }, [page]) // eski arama, Mod Kütüphanesi'ne sonradan girince geri gelmesin
  const idx = NAV.findIndex(n => n[0] === page)
  const us = upd.state
  const notices: Notice[] = [
    ...(us.phase === 'available' || us.phase === 'ready' ? [{ id: 'upd', text: `TankClient v${us.version} ${us.phase === 'ready' ? 'kuruluma hazır' : 'hazır'}`, page: 'settings' as Page }] : []),
    ...dl.tasks.filter(t => t.state === 'error').slice(0, 3).map(t => ({ id: t.id, text: `İndirme hatası: ${t.title}`, page: 'downloads' as Page })),
  ]
  const createProfile = (n: string, m: string, l: string) => { void p.create(n, m, l).then(e => { if (e) toast(e); else { setNewP(false); setPage('library') } }) }
  return (
    <div className="app">
      <aside>
        <div className="brand"><svg width="38" height="38" viewBox="0 0 40 40"><path d="M20 2l16 9v18l-16 9L4 29V11z" fill="#18191c" stroke="#ff6a1a" strokeWidth="2.5" /><path d="M11 14h18v5h-6.5v11h-5V19H11z" fill="#ff6a1a" /></svg>
          <div><span>Tank<b>Client</b></span><small>Blokların ötesinde</small></div></div>
        <nav><div className="ind" style={{ transform: `translateY(${idx * 48}px)` }} />
          {NAV.map(([k, n]) => <button key={k} className={k === page ? 'on' : ''} onClick={() => setPage(k)}><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICONS[k] }} />{n}{k === 'downloads' && dl.active.length > 0 && <span className="bdg">{dl.active.length}</span>}</button>)}</nav>
        <div className="profs">
          <h4>Profiller</h4>
          <div className="ptiles">
            {(p.insts ?? []).map(i => <button key={i.id} className={'pt' + (i.id === p.selId ? ' on' : '')} title={`${i.name} · ${i.loader} ${i.mc}`} onClick={() => { p.setSelId(i.id); setPage('library') }}><ProfileIcon p={i} /></button>)}
            <button className="pt add" title="Yeni profil" onClick={() => setNewP(true)}>+</button>
          </div>
        </div>
        <div className="sideart" style={{ backgroundImage: `url(${side})` }}><span>TankClient{us.current ? ` v${us.current}` : ''}</span></div>
        <Account auth={auth} />
      </aside>
      <div className="shell">
        <TopBar onSearch={q => { setSearch({ q, n: Date.now() }); setPage('packs') }} notices={notices} go={setPage} />
        <div className="body">
          <main key={page}>
            <UpdateBanner upd={upd} />
            {page === 'home' && <Home go={setPage} g={g} t={t} p={p} onNewProfile={() => setNewP(true)} />}
            {page === 'library' && <Library toast={toast} g={g} p={p} go={setPage} />}
            {page === 'servers' && <Servers toast={toast} g={g} />}
            {page === 'packs' && <ModLibrary toast={toast} g={g} p={p} query={search} />}
            {page === 'downloads' && <Downloads dl={dl} />}
            {page === 'player' && <Player auth={auth} />}
            {page === 'settings' && <Settings upd={upd} />}
          </main>
          {(page === 'home' || page === 'packs') && <RightRail kind={page === 'home' ? 'home' : 'mods'} go={setPage} />}
        </div>
        <Dock g={g} dl={dl} p={p} t={t} go={setPage} />
      </div>
      {newP && <NewProfile vers={g.vers} onCreate={createProfile} onClose={() => setNewP(false)} />}
      <div id="toast" className={msg ? 'on' : ''}>{msg}</div>
    </div>
  )
}
