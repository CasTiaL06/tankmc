import { useEffect, useState } from 'react'
import hero from '../assets/hero.jpg'
import type { Game } from '../lib/useGame'
import type { Page } from '../lib/nav'
import type { Target } from '../lib/useTarget'
import type { Profiles } from '../lib/useProfiles'
import { ICONS } from '../lib/icons'

const dur = (ms: number) => { const m = Math.round(ms / 60000); return m < 60 ? `${m} dk` : `${Math.floor(m / 60)} sa ${m % 60} dk` }
const compact = new Intl.NumberFormat('tr-TR', { notation: 'compact' })

// Modrinth'in gerçek en çok indirilen modları (çevrimdışıysa bölüm gösterilmez)
function Featured({ go }: { go: (p: Page) => void }) {
  const [hits, setHits] = useState<ModHit[]>([])
  useEffect(() => { window.tank?.mods.search({ query: '', type: 'mod', sort: 'downloads' }).then(r => { if (r.ok) setHits(r.hits.slice(0, 3)) }) }, [])
  if (!hits.length) return null
  return (<>
    <h2 className="sec">Öne çıkanlar<a className="lnk" style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0 }} onClick={() => go('packs')}>Tümünü gör →</a></h2>
    <div className="grid">{hits.map(h => (
      <div className="card" key={h.id}><div className="cv"><span className="ld">Mod</span>{(h.cover ?? h.icon) && <img alt="" src={(h.cover ?? h.icon) as string} />}</div>
        <div className="cb"><h3>{h.title}</h3><p>{h.desc}</p><div className="meta"><div className="chips"><span>⬇ {compact.format(h.downloads)}</span><span>{h.author}</span></div><button className="btn g" onClick={() => go('packs')}>Kütüphane</button></div></div></div>))}</div>
  </>)
}

const LN: Record<string, string> = { vanilla: 'Vanilla', fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt' }
export default function Home({ go, g, t, p, onNewProfile }: { go: (p: Page) => void; g: Game; t: Target; p: Profiles; onNewProfile: () => void }) {
  const [st, setSt] = useState<PlayStats | null>(null)
  useEffect(() => { window.tank?.stats.get().then(r => { if (r.ok) setSt(r.stats) }) }, [g.live])
  const tiles: [string, string, () => void][] = [['Mod Kütüphanesi', 'puzzle', () => go('packs')], ['Sunucu Ekle', 'servers', () => go('servers')], ['Profil Oluştur', 'library', onNewProfile], ['Ayarlar', 'settings', () => go('settings')]]
  return (
    <section className="view on">
      <div className="hero">
        <div className="art" style={{ backgroundImage: `url(${hero})` }} />
        <div className="hc"><span className="tag">MINECRAFT JAVA LAUNCHER</span>
          <h2>Minecraft’ta<span>Yeni Bir Deneyim</span></h2>
          <p className="st" style={{ margin: 0 }}>TankClient ile oyunu bir üst seviyeye taşı.</p>
          <div className="row">
            <button className="play" onClick={t.play} disabled={g.busy}><svg viewBox="0 0 24 24"><path d="M6 3l15 9-15 9z" /></svg>{g.live ? 'OYUN AÇIK' : g.busy ? 'HAZIRLANIYOR' : 'OYUNA BAŞLA'}</button>
            <select value={t.inst ? `p:${t.inst.id}` : `v:${g.ver}`} disabled={g.busy} title="Ne başlatılsın?" onChange={e => { const v = e.target.value; if (v.startsWith('p:')) t.set(v.slice(2)); else { t.set('ver'); g.setVer(v.slice(2)) } }}>
              <optgroup label="Vanilla">{g.vers.length ? g.vers.map(v => <option key={v} value={`v:${v}`}>Minecraft {v}</option>) : <option value={`v:${g.ver}`}>{window.tank ? 'Sürümler yükleniyor…' : 'Sürüm yok'}</option>}</optgroup>
              {!!p.insts?.length && <optgroup label="Profillerim">{p.insts.map(i => <option key={i.id} value={`p:${i.id}`}>{i.name} · {LN[i.loader] ?? i.loader} {i.mc}</option>)}</optgroup>}
            </select>
            <button className="pill" onClick={() => go('packs')}><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICONS.puzzle }} />Mod Kütüphanesi</button>
          </div>
        </div>
        <div className="stats">
          <div><b>{st ? dur(st.totalMs) : '—'}</b><span>Toplam oyun süresi</span></div>
          <div><b>{st ? st.count : '—'}</b><span>Oyun oturumu</span></div>
        </div>
      </div>
      <h2 className="sec">Hızlı işlemler</h2>
      <div className="qa">
        {tiles.map(([t, ic, fn]) => <button key={t} className="qt" onClick={fn}><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICONS[ic] }} />{t}</button>)}
        <div className="qt qlast"><div><span className="st">Son oynanan</span><b>{g.last ?? 'Henüz oynanmadı'}</b></div><button className="btn" disabled={g.busy || !g.ver} onClick={t.play}>DEVAM ET</button></div>
      </div>
      <Featured go={go} />
    </section>
  )
}
