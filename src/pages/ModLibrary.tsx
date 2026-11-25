import { useEffect, useRef, useState } from 'react'
import { scene, Biome } from '../lib/scene'
import NewProfile from '../components/NewProfile'
import type { Game } from '../lib/useGame'
import type { Profiles } from '../lib/useProfiles'

const CATS: [string, string][] = [['', 'Tümü'], ['adventure', 'Macera'], ['decoration', 'Dekorasyon'], ['equipment', 'Ekipman'], ['food', 'Yemek'], ['game-mechanics', 'Oyun mekaniği'], ['library', 'Kütüphane'], ['magic', 'Büyü'], ['mobs', 'Yaratıklar'], ['optimization', 'Performans'], ['storage', 'Depolama'], ['technology', 'Teknoloji'], ['transportation', 'Ulaşım'], ['utility', 'Araçlar'], ['worldgen', 'Dünya üretimi']]
const CN = Object.fromEntries(CATS)
const LD: [string, string][] = [['fabric', 'Fabric'], ['forge', 'Forge'], ['neoforge', 'NeoForge'], ['quilt', 'Quilt']]
const LN: Record<string, string> = { ...Object.fromEntries(LD), vanilla: 'Vanilla' }
const BIOMES: Biome[] = ['grass', 'nether', 'end', 'snow', 'desert', 'cave']
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const fmt = new Intl.NumberFormat('tr-TR', { notation: 'compact' })
const ls = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }

function Thumb({ src, name }: { src: string | null; name: string }) {
  return src ? <img className="th" alt="" src={src} loading="lazy" /> : <div className="th" dangerouslySetInnerHTML={{ __html: scene(hash(name) % 997, BIOMES[hash(name) % 6]) }} />
}
export default function ModLibrary({ toast, g, p }: { toast: (m: string) => void; g: Game; p: Profiles }) {
  const api = window.tank?.mods
  const { insts, setInsts, selId, setSelId } = p
  const [tab, setTab] = useState<'mod' | 'modpack' | 'installed'>('mod')
  const [q, setQ] = useState(''), [cat, setCat] = useState(''), [sort, setSort] = useState('relevance'), [compat, setCompat] = useState(true)
  const [hits, setHits] = useState<ModHit[]>([]), [total, setTotal] = useState(0), [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<Record<string, boolean>>({}), [detail, setDetail] = useState<ModHit | null>(null), [proj, setProj] = useState<ModProject | null>(null)
  const [upd, setUpd] = useState<ModUpdate[]>([]), [form, setForm] = useState(false)
  const seq = useRef(0)
  const inst = insts?.find(i => i.id === selId) ?? insts?.[0]

  const run = (offset: number) => {
    if (!api || tab === 'installed') return
    const my = ++seq.current, c = compat && tab === 'mod' ? inst : undefined
    setLoading(true)
    api.search({ query: q, type: tab, mc: c?.mc, loader: c && c.loader !== 'vanilla' ? c.loader : undefined, category: cat || undefined, sort, offset }).then(r => {
      if (my !== seq.current) return
      setLoading(false)
      if (!r.ok) return toast(r.error)
      setTotal(r.total); setHits(h => (offset ? [...h, ...r.hits] : r.hits))
    })
  }
  useEffect(() => { const t = setTimeout(() => run(0), q ? 350 : 0); return () => clearTimeout(t) }, [tab, q, cat, sort, compat, inst?.id, inst?.mc, inst?.loader])
  useEffect(() => { setProj(null); if (detail) api?.project(detail.id).then(r => { if (r.ok) setProj(r.project) }) }, [detail?.id])
  useEffect(() => { setUpd([]) }, [inst?.id])
  if (!api) return <section className="view on"><h1>Mod Kütüphanesi</h1><p className="sub">Mod kütüphanesi yalnızca masaüstü uygulamasında kullanılabilir.</p></section>

  const put = (i: Inst) => setInsts(l => (l ? l.map(x => (x.id === i.id ? i : x)) : [i]))
  const flag = (id: string, v: boolean) => setBusy(b => ({ ...b, [id]: v }))
  const have = new Set(inst?.mods.map(m => m.projectId))
  const createProfile = async (name: string, mc: string, ld: string) => {
    const r = await api.create(name, mc, ld); if (!r.ok) return toast(r.error)
    setInsts(l => [...(l ?? []), r.instance]); setSelId(r.instance.id); setForm(false); try { localStorage.setItem('tc.inst', r.instance.id) } catch { /* yok say */ }
  }
  const delProfile = async () => {
    if (!inst || !confirm(`“${inst.name}” profili silinsin mi? Profil klasörü ve içindeki tüm dosyalar (modlar, ayarlar, dünyalar) kalıcı olarak silinir.`)) return
    const r = await api.remove(inst.id); if (!r.ok) return toast(r.error)
    setInsts(l => (l ?? []).filter(x => x.id !== inst.id)); setSelId('')
  }
  const install = async (h: ModHit) => {
    if (!inst || inst.loader === 'vanilla') { setForm(true); return toast('Önce Fabric, Forge, NeoForge veya Quilt profili oluştur.') }
    flag(h.id, true); const r = await api.install(inst.id, h.id); flag(h.id, false)
    if (!r.ok) return toast(r.error)
    put(r.instance); toast(r.installed.length ? `Kuruldu: ${r.installed.join(', ')}` : 'Mod zaten kurulu.')
  }
  const installPack = async (h: ModHit) => {
    flag(h.id, true); const r = await api.installPack(h.id); flag(h.id, false)
    if (!r.ok) return toast(r.error)
    setInsts(l => [...(l ?? []), r.instance]); setSelId(r.instance.id); setTab('installed'); setDetail(null); toast(`“${r.instance.name}” yeni profil olarak kuruldu.`)
  }
  const toggle = async (m: ModRec) => { if (!inst) return; const r = await api.toggle(inst.id, m.projectId); if (r.ok) put(r.instance); else toast(r.error) }
  const remove = async (m: ModRec) => { if (!inst || !confirm(`“${m.title}” kaldırılsın mı?`)) return; const r = await api.uninstall(inst.id, m.projectId); if (r.ok) put(r.instance); else toast(r.error) }
  const check = async () => {
    if (!inst) return; flag('check', true); const r = await api.check(inst.id); flag('check', false)
    if (!r.ok) return toast(r.error)
    setUpd(r.updates); toast(r.updates.length ? `${r.updates.length} mod için güncelleme var.` : r.failed ? `${r.failed} mod kontrol edilemedi; kalanlar güncel.` : 'Tüm modlar güncel.')
  }
  const update = async (m: ModRec) => {
    if (!inst) return; flag(m.projectId, true); const r = await api.update(inst.id, m.projectId); flag(m.projectId, false)
    if (!r.ok) return toast(r.error)
    put(r.instance); setUpd(u => u.filter(x => x.projectId !== m.projectId))
  }
  const actionBtn = (h: ModHit) => tab === 'modpack'
    ? <button className="btn" disabled={busy[h.id]} onClick={e => { e.stopPropagation(); void installPack(h) }}>{busy[h.id] ? 'KURULUYOR…' : 'PROFİL OLARAK KUR'}</button>
    : have.has(h.id) ? <button className="btn ok" onClick={e => e.stopPropagation()}>KURULU ✓</button>
    : <button className="btn" disabled={busy[h.id]} onClick={e => { e.stopPropagation(); void install(h) }}>{busy[h.id] ? 'KURULUYOR…' : 'KUR'}</button>
  const spot = tab !== 'installed' && !q && !cat && hits.length > 0 ? hits[0] : null

  return (
    <section className="view on">
      <h1>Mod Kütüphanesi</h1><p className="sub">Modrinth’ten mod ve mod paketi keşfet, profillerine kur</p>
      <div className="pbar">
        {inst ? <>
          <select className="pbsel" value={inst.id} onChange={e => { setSelId(e.target.value); try { localStorage.setItem('tc.inst', e.target.value) } catch { /* yok say */ } }}>{(insts ?? []).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
          <span className="chips"><span>MC {inst.mc}</span><span>{LN[inst.loader] ?? inst.loader}</span><span>{inst.mods.length} mod</span></span>
          <button className="btn g" style={{ minWidth: 0 }} onClick={() => void delProfile()}>Profili sil</button>
        </> : <span className="st">{insts ? 'Mod kurmak için bir profil oluştur.' : 'Yükleniyor…'}</span>}
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setForm(true)}>+ YENİ PROFİL</button>
      </div>
      <p className="notice">Fabric, Forge ve NeoForge ile oyun başlatma sonraki aşamada eklenecek. Kurduğun modlar profil klasöründe hazır bekler; OYNA şimdilik yalnızca Vanilla başlatır.</p>
      <div className="tabs">{([['mod', 'Keşfet'], ['modpack', 'Mod Paketleri'], ['installed', `Kurulu (${inst?.mods.length ?? 0})`]] as const).map(([k, v]) => <button key={k} className={'fc' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{v}</button>)}</div>

      {tab === 'installed' ? (
        !inst ? <div className="empty">Henüz profil yok.</div> : <>
          <div className="tools"><button className="btn g" disabled={busy.check || !inst.mods.length} onClick={() => void check()}>{busy.check ? 'KONTROL EDİLİYOR…' : 'GÜNCELLEMELERİ KONTROL ET'}</button>
            {inst.pack && <span className="st">Bu profil bir mod paketinden oluşturuldu.</span>}</div>
          {!inst.mods.length && <div className="empty">Bu profilde henüz mod yok. Keşfet sekmesinden kurabilirsin.</div>}
          {inst.mods.map(m => { const u = upd.find(x => x.projectId === m.projectId); return (
            <div className="mrow" key={m.projectId} style={{ opacity: m.enabled ? 1 : .55, cursor: 'default' }}>
              <Thumb src={m.icon} name={m.title} />
              <div className="mt"><b>{m.title}{m.dep && <span className="st"> · bağımlılık</span>}</b><span>{m.version ? `Sürüm ${m.version} · ` : ''}{m.file}</span>{u && <span className="upb">Güncelleme var: {u.from} → {u.to}</span>}</div>
              {u && <button className="btn" disabled={busy[m.projectId]} onClick={() => void update(m)}>{busy[m.projectId] ? '…' : 'GÜNCELLE'}</button>}
              <div className={'tg' + (m.enabled ? ' on' : '')} title={m.enabled ? 'Devre dışı bırak' : 'Etkinleştir'} onClick={() => void toggle(m)} />
              <button className="btn g" style={{ minWidth: 0 }} onClick={() => void remove(m)}>Kaldır</button>
            </div>) })}
        </>
      ) : (
        <div className="lib">
          <div className="rail">
            <h4>Kategori</h4>{CATS.map(([k, v]) => <button key={k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{v}</button>)}
            {tab === 'mod' && inst && inst.loader !== 'vanilla' && <><h4>Uyumluluk</h4><div className="row" style={{ padding: '0 12px', gap: 10 }}><div className={'tg' + (compat ? ' on' : '')} onClick={() => setCompat(!compat)} /><span className="st" style={{ margin: 0 }}>{inst.mc} · {LN[inst.loader]}</span></div></>}
          </div>
          <div>
            <div className="tools">
              <label className="srch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></svg><input value={q} onChange={e => setQ(e.target.value)} placeholder={tab === 'mod' ? 'Mod ara…' : 'Mod paketi ara…'} /></label>
              <select value={sort} onChange={e => setSort(e.target.value)}>{[['relevance', 'İlgililik'], ['downloads', 'En çok indirilen'], ['follows', 'En çok takip edilen'], ['newest', 'En yeni'], ['updated', 'Son güncellenen']].map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            {spot && <div className="spot" onClick={() => setDetail(spot)}>
              {spot.cover && <img className="bg" alt="" src={spot.cover} />}
              <div className="in"><span className="tag">ÖNE ÇIKAN</span><h2 style={{ fontSize: 26 }}>{spot.title}</h2><p className="st" style={{ margin: 0 }}>{spot.desc}</p>
                <div className="row"><Thumb src={spot.icon} name={spot.title} />{actionBtn(spot)}</div></div></div>}
            {(spot ? hits.slice(1) : hits).map(h => (
              <div className="mrow" key={h.id} onClick={() => setDetail(h)}>
                <Thumb src={h.icon} name={h.title} />
                <div className="mt"><b>{h.title} <span className="st">· {h.author}</span></b><span>{h.desc}</span>
                  <span className="chips" style={{ marginTop: 4 }}>{h.loaders.slice(0, 3).map(l => <span key={l}>{LN[l]}</span>)}{h.cats.map(c => <span key={c}>{CN[c] ?? c}</span>)}</span></div>
                <span className="st" title="İndirme">⬇ {fmt.format(h.downloads)}</span>
                {actionBtn(h)}
              </div>))}
            {!loading && !hits.length && <div className="empty">Sonuç bulunamadı. {compat && tab === 'mod' && inst ? 'Uyumluluk filtresini kapatmayı dene.' : 'Aramayı değiştir.'}</div>}
            {loading && <div className="empty">Yükleniyor…</div>}
            {!loading && hits.length < total && <button className="btn g" style={{ width: '100%' }} onClick={() => run(hits.length)}>DAHA FAZLA YÜKLE ({hits.length}/{total})</button>}
          </div>
        </div>
      )}

      {detail && <div className="dr">
        <button className="fc" style={{ alignSelf: 'flex-end' }} onClick={() => setDetail(null)}>✕ Kapat</button>
        <div className="row"><Thumb src={detail.icon} name={detail.title} /><div><h3>{detail.title}</h3><span className="st">{detail.author} · ⬇ {fmt.format(detail.downloads)} · ♥ {fmt.format(detail.follows)}</span></div></div>
        <p style={{ color: 'var(--mu)' }}>{detail.desc}</p>
        {proj?.gallery.length ? <div className="gal">{proj.gallery.map(x => <img key={x.url} alt={x.title} src={x.url} loading="lazy" />)}</div> : !proj ? <span className="st">Ayrıntılar yükleniyor…</span> : null}
        <div className="chips">{(proj?.loaders ?? detail.loaders).map(l => <span key={l}>{LN[l]}</span>)}{detail.cats.map(c => <span key={c}>{CN[c] ?? c}</span>)}</div>
        {proj && <>
          <div className="kv"><span>Lisans</span><b>{proj.license || 'belirtilmemiş'}</b></div>
          <div className="kv"><span>İstemci / Sunucu</span><b>{proj.client} / {proj.server}</b></div>
          <div className="row" style={{ flexWrap: 'wrap' }}>{proj.links.map(l => <button key={l.url} className="btn g" onClick={() => void api.open(l.url)}>{l.label}</button>)}</div></>}
        <div className="acts" style={{ marginTop: 'auto' }}>{actionBtn(detail)}</div>
      </div>}
      {form && <NewProfile vers={g.vers} onCreate={(n, m, l) => void createProfile(n, m, l)} onClose={() => setForm(false)} />}
    </section>
  )
}
