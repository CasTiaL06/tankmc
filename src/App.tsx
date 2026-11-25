import { useEffect, useMemo, useRef, useState } from 'react'
import { PACKS } from './data'
import { isoHero, scene } from './lib/scene'
import Packs from './pages/Packs'
import Servers from './pages/Servers'
import Settings from './pages/Settings'
import Account from './components/Account'

const ICONS: Record<string, string> = {
  home: '<path d="M3 11l9-8 9 8v10H3z"/><path d="M9 21v-7h6v7"/>',
  servers: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/>',
  packs: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
}
const NAV = [['home', 'Ana Sayfa'], ['servers', 'Sunucular'], ['packs', 'Mod Paketleri'], ['settings', 'Ayarlar']] as const
type Page = typeof NAV[number][0]

function Home({ go, toast }: { go: (p: Page) => void; toast: (m: string) => void }) {
  const api = window.tank?.game
  const [vers, setVers] = useState<string[]>([]), [ver, setVer] = useState(''), [ldr, setLdr] = useState('Vanilla')
  const [last, setLast] = useState<string | null>(() => { try { return localStorage.getItem('tc.last') } catch { return null } })
  const [busy, setBusy] = useState(false), [live, setLive] = useState(false), [prog, setProg] = useState<{ text: string; pct: number } | null>(null)
  const verRef = useRef(''); verRef.current = ver
  const iso = useMemo(isoHero, [])
  useEffect(() => {
    if (!api) return
    api.versions().then(r => { if (r.ok) { setVers(r.versions); setVer(v => v || r.versions[0]) } else toast(r.error) })
    const offs = [api.onProgress(setProg), api.onState(s => {
      if (s.state === 'preparing') setBusy(true)
      if (s.state === 'running') {
        setLive(true); setProg(null)
        const l = `Vanilla ${verRef.current}`; setLast(l); try { localStorage.setItem('tc.last', l) } catch { /* yok say */ }
      }
      if (s.state === 'exited' || s.state === 'error') { setBusy(false); setLive(false); setProg(null); if (s.message) toast(s.message) }
    })]
    return () => offs.forEach(f => f())
  }, [])
  const play = async () => {
    if (!api) return toast('Oyun başlatma yalnızca masaüstü uygulamasında çalışır.')
    if (!ver) return toast('Sürüm listesi henüz yüklenmedi.')
    const r = await api.play(ver)
    if (!r.ok) toast(r.error ?? 'Başlatılamadı.')
  }
  return (
    <section className="view on">
      <div className="hero">
        <svg className="iso" viewBox="0 0 520 340" preserveAspectRatio="xMidYMid slice" dangerouslySetInnerHTML={{ __html: iso }} />
        <div className="hc"><span className="tag">MINECRAFT JAVA LAUNCHER</span><h2>Blokları <b>sen</b> yönet.</h2>
          <div className="last">Son oynanan: <b>{last ?? 'Henüz oynanmadı'}</b></div>
          <div className="row">
            <button className="play" onClick={play} disabled={busy}><svg viewBox="0 0 24 24"><path d="M6 3l15 9-15 9z" /></svg>{live ? 'OYUN AÇIK' : busy ? 'HAZIRLANIYOR' : 'OYNA'}</button>
            <select value={ver} onChange={e => setVer(e.target.value)} disabled={busy}>{vers.length ? vers.map(v => <option key={v}>{v}</option>) : <option>{api ? 'Sürümler yükleniyor…' : 'Sürüm yok'}</option>}</select>
            <select value={ldr} onChange={e => setLdr(e.target.value)}>{['Vanilla', 'Fabric', 'Forge', 'NeoForge'].map(v => <option key={v} disabled={v !== 'Vanilla'}>{v}{v !== 'Vanilla' ? ' (yakında)' : ''}</option>)}</select>
          </div>
          <div className={'bar' + (prog ? ' on' : '')}><i style={{ width: (prog ? prog.pct * 100 : 0) + '%' }} /></div>
          <div className="st">{prog?.text}</div>
        </div>
      </div>
      <h2 className="sec">Öne çıkan içerikler</h2>
      <div className="grid">{PACKS.filter(p => p.f).map(p => (
        <div className="card" key={p.id}><div className="cv"><span className="ld">{p.l}</span><div style={{ height: '100%' }} dangerouslySetInnerHTML={{ __html: scene(p.s, p.k) }} /></div>
          <div className="cb"><h3>{p.n}</h3><p>{p.d}</p><div className="meta"><div className="chips"><span>{p.v}</span><span>{p.m} mod</span></div><button className="btn g" onClick={() => go('packs')}>İncele</button></div></div></div>))}</div>
    </section>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('home'), [msg, setMsg] = useState(''), tm = useRef<number>()
  const toast = (m: string) => { setMsg(m); clearTimeout(tm.current); tm.current = window.setTimeout(() => setMsg(''), 3200) }
  useEffect(() => () => clearTimeout(tm.current), [])
  const idx = NAV.findIndex(n => n[0] === page)
  return (
    <div className="app">
      <aside>
        <div className="brand"><svg width="36" height="36" viewBox="0 0 40 40"><path d="M20 2l16 9v18l-16 9L4 29V11z" fill="#18191c" stroke="#ff6a1a" strokeWidth="2.5" /><path d="M11 14h18v5h-6.5v11h-5V19H11z" fill="#ff6a1a" /></svg><span>Tank<b>Client</b></span></div>
        <nav><div className="ind" style={{ transform: `translateY(${idx * 48}px)` }} />
          {NAV.map(([k, n]) => <button key={k} className={k === page ? 'on' : ''} onClick={() => setPage(k)}><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICONS[k] }} />{n}</button>)}</nav>
        <Account toast={toast} />
      </aside>
      <main key={page}>
        {page === 'home' && <Home go={setPage} toast={toast} />}
        {page === 'servers' && <Servers toast={toast} />}
        {page === 'packs' && <Packs toast={toast} />}
        {page === 'settings' && <Settings />}
      </main>
      <div id="toast" className={msg ? 'on' : ''}>{msg}</div>
    </div>
  )
}
