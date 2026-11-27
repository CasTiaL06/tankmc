import { useState } from 'react'
import ProfileIcon from '../components/ProfileIcon'
import NewProfile from '../components/NewProfile'
import type { Game } from '../lib/useGame'
import type { Profiles } from '../lib/useProfiles'

const PLAYABLE = ['vanilla', 'fabric', 'quilt', 'forge', 'neoforge']
const LN: Record<string, string> = { vanilla: 'Vanilla', fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt' }

export default function Library({ toast, g, p, go }: { toast: (m: string) => void; g: Game; p: Profiles; go: (k: 'packs') => void }) {
  const [q, setQ] = useState(''), [form, setForm] = useState(false)
  if (!window.tank) return <section className="view on"><h1>Kütüphane</h1><p className="sub">Profiller yalnızca masaüstü uygulamasında kullanılabilir.</p></section>
  const L = (p.insts ?? []).filter(i => i.name.toLowerCase().includes(q.toLowerCase()))
  const play = (i: Inst) => { toast(`${i.name} başlatılıyor… İlerleme Ana sayfada.`); void g.play(undefined, { version: i.mc, profileId: i.id, name: i.name }) }
  const del = async (i: Inst) => {
    if (!confirm(`“${i.name}” profili silinsin mi? Profil klasörü ve içindeki tüm dosyalar (modlar, ayarlar, dünyalar) kalıcı olarak silinir.`)) return
    const e = await p.remove(i.id); if (e) toast(e)
  }
  const create = async (n: string, mc: string, ld: string) => { const e = await p.create(n, mc, ld); if (e) toast(e); else setForm(false) }
  const canPlay = !g.busy && !g.live
  return (
    <section className="view on">
      <h1>Kütüphane</h1><p className="sub">Profillerin: her biri kendi sürümü, modları ve dünyalarıyla ayrı çalışır</p>
      <div className="tools">
        <label className="srch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></svg><input value={q} onChange={e => setQ(e.target.value)} placeholder="Profil ara…" /></label>
        <button className="btn" onClick={() => setForm(true)}>+ YENİ PROFİL</button>
      </div>
      {p.insts && !L.length && <div className="empty">{p.insts.length ? 'Aramanla eşleşen profil yok.' : 'Henüz profilin yok. “Yeni profil” ile başla veya Mod Kütüphanesi’nden bir mod paketi kur.'}</div>}
      <div className="grid pg">{L.map(i => (
        <div className={'card pc' + (i.id === p.selId ? ' sel' : '')} key={i.id} onClick={() => p.setSelId(i.id)}>
          <div className="pico"><ProfileIcon p={i} /><span className="ld">{LN[i.loader] ?? i.loader}</span></div>
          <div className="cb"><h3>{i.name}</h3><p>MC {i.mc} · {i.mods.length} mod{i.pack ? ' · mod paketi' : ''}</p>
            <div className="meta"><span style={{ display: 'flex', gap: 6 }}>
              <button className="btn g" style={{ minWidth: 0 }} onClick={e => { e.stopPropagation(); p.setSelId(i.id); go('packs') }}>Modlar</button>
              <button className="btn g" style={{ minWidth: 0 }} onClick={e => { e.stopPropagation(); void del(i) }}>Sil</button></span>
              <button className="btn" disabled={!canPlay || !PLAYABLE.includes(i.loader)} title={!PLAYABLE.includes(i.loader) ? `${LN[i.loader] ?? i.loader} ile başlatma sonraki aşamada eklenecek` : ''} style={!PLAYABLE.includes(i.loader) ? { opacity: .45 } : undefined} onClick={e => { e.stopPropagation(); play(i) }}>OYNA</button></div></div>
        </div>))}</div>
      {form && <NewProfile vers={g.vers} onCreate={(n, m, l) => void create(n, m, l)} onClose={() => setForm(false)} />}
    </section>
  )
}
