import { useEffect, useRef, useState } from 'react'
import { scene, Biome } from '../lib/scene'
import type { Game } from '../lib/useGame'

type St = PingRes | { checking: true }
type Modal = { kind: 'edit'; srv?: SrvEntry } | { kind: 'detail'; id: string } | null
const BIOMES: Biome[] = ['grass', 'nether', 'end', 'snow', 'desert', 'cave']
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

function Icon({ s, st }: { s: SrvEntry; st?: St }) {
  const fav = st && 'favicon' in st ? st.favicon : undefined
  return <div className="si">{fav ? <img alt="" src={fav} /> : <div style={{ height: '100%' }} dangerouslySetInnerHTML={{ __html: scene(hash(s.name) % 997, BIOMES[hash(s.name) % 6]) }} />}</div>
}
const line = (st?: St) => !st || 'checking' in st ? <span>Kontrol ediliyor…</span>
  : st.online ? <span className="on-d">● Çevrimiçi · {st.players ?? '?'}/{st.max ?? '?'}</span> : <span>○ Çevrimdışı{st.error ? ` · ${st.error}` : ''}</span>

function Edit({ srv, onSave, onClose }: { srv?: SrvEntry; onSave: (e: SrvEntry) => void; onClose: () => void }) {
  const [name, setName] = useState(srv?.name ?? ''), [address, setAddress] = useState(srv?.address ?? ''), [desc, setDesc] = useState(srv?.desc ?? '')
  return (
    <div className="ov" onClick={onClose}><div className="mdl f" onClick={e => e.stopPropagation()}>
      <h3>{srv ? 'Sunucuyu düzenle' : 'Sunucu ekle'}</h3>
      <input className="fi" placeholder="Sunucu adı" maxLength={40} value={name} onChange={e => setName(e.target.value)} />
      <input className="fi" placeholder="Adres (play.sunucu.com veya 1.2.3.4:25566)" value={address} onChange={e => setAddress(e.target.value)} />
      <input className="fi" placeholder="Açıklama (isteğe bağlı)" maxLength={120} value={desc} onChange={e => setDesc(e.target.value)} />
      <div className="acts"><button className="btn g" onClick={onClose}>İptal</button>
        <button className="btn" disabled={!name.trim() || !address.trim()} onClick={() => onSave({ id: srv?.id ?? crypto.randomUUID(), name, address, desc, fav: srv?.fav ?? false })}>KAYDET</button></div>
    </div></div>
  )
}

export default function Servers({ toast, g }: { toast: (m: string) => void; g: Game }) {
  const api = window.tank?.servers
  const [list, setList] = useState<SrvEntry[] | null>(null), [st, setSt] = useState<Record<string, St>>({})
  const [q, setQ] = useState(''), [onlyFav, setOnlyFav] = useState(false), [modal, setModal] = useState<Modal>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; api?.list().then(setList); return () => { alive.current = false } }, [])
  const key = list?.map(s => s.id + s.address).join('|') ?? ''
  const refresh = (l: SrvEntry[]) => l.forEach(s => {
    setSt(o => (o[s.id] ? o : { ...o, [s.id]: { checking: true } }))
    api?.ping(s.address).then(r => { if (alive.current) setSt(o => ({ ...o, [s.id]: r })) })
  })
  useEffect(() => { if (!list) return; refresh(list); const t = setInterval(() => refresh(list), 60000); return () => clearInterval(t) }, [key])
  if (!api) return <section className="view on"><h1>Sunucular</h1><p className="sub">Sunucu listesi yalnızca masaüstü uygulamasında kullanılabilir.</p></section>
  const persist = async (l: SrvEntry[]) => { const r = await api.save(l); setList(r); return r }
  const save = async (e: SrvEntry) => {
    const l = list ?? [], r = await persist(l.some(x => x.id === e.id) ? l.map(x => (x.id === e.id ? e : x)) : [...l, e])
    if (!r.some(x => x.id === e.id)) toast('Geçersiz sunucu adresi. Örnek: play.sunucu.com veya 1.2.3.4:25566'); else setModal(null)
  }
  const remove = async (s: SrvEntry) => { if (confirm(`“${s.name}” silinsin mi?`)) { await persist((list ?? []).filter(x => x.id !== s.id)); setModal(null) } }
  const flip = (s: SrvEntry) => persist((list ?? []).map(x => (x.id === s.id ? { ...x, fav: !x.fav } : x)))
  const join = (s: SrvEntry) => { setModal(null); toast(`${s.name} için Minecraft ${g.ver} başlatılıyor… İlerleme Ana sayfada.`); void g.play(s.address) }
  const L = (list ?? []).filter(s => (!onlyFav || s.fav) && (s.name + s.address).toLowerCase().includes(q.toLowerCase())).sort((a, b) => +b.fav - +a.fav)
  const det = modal?.kind === 'detail' ? (list ?? []).find(s => s.id === modal.id) : undefined, dst = det ? st[det.id] : undefined
  const canJoin = !g.busy && !g.live
  return (
    <section className="view on">
      <h1>Sunucular</h1><p className="sub">Kendi sunucularını ekle; oyuncu sayısı ve durum canlı olarak sunucudan okunur</p>
      <div className="tools">
        <label className="srch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></svg><input value={q} onChange={e => setQ(e.target.value)} placeholder="Sunucu ara…" /></label>
        <button className={'fc' + (!onlyFav ? ' on' : '')} onClick={() => setOnlyFav(false)}>Tümü</button>
        <button className={'fc' + (onlyFav ? ' on' : '')} onClick={() => setOnlyFav(true)}>★ Favoriler</button>
        <button className="fc" onClick={() => list && (setSt({}), refresh(list))}>⟳ Yenile</button>
        <button className="btn" onClick={() => setModal({ kind: 'edit' })}>+ SUNUCU EKLE</button>
      </div>
      {list && !L.length && <div className="empty">{list.length ? 'Aramanla eşleşen sunucu yok.' : 'Henüz sunucu eklemedin. “Sunucu ekle” ile ilk sunucunu ekle.'}</div>}
      <div className="grid">{L.map(s => (
        <div className="card sv" key={s.id}>
          <button className={'fav' + (s.fav ? ' on' : '')} onClick={() => flip(s)}>★</button>
          <Icon s={s} st={st[s.id]} />
          <div className="cb"><h3>{s.name}</h3><p>{s.desc || s.address}</p>
            <div className="meta">{line(st[s.id])}
              <span style={{ display: 'flex', gap: 6 }}><button className="btn g" style={{ minWidth: 0 }} onClick={() => setModal({ kind: 'detail', id: s.id })}>Detay</button>
                <button className="btn" disabled={!canJoin || !(st[s.id] && 'online' in st[s.id] && (st[s.id] as PingRes).online)} onClick={() => join(s)}>KATIL</button></span></div></div>
        </div>))}</div>
      {modal?.kind === 'edit' && <Edit srv={modal.srv} onSave={save} onClose={() => setModal(null)} />}
      {det && <div className="ov" onClick={() => setModal(null)}><div className="mdl f" onClick={e => e.stopPropagation()}>
        <div className="row"><Icon s={det} st={dst} /><div><h3>{det.name}</h3><div className="kv"><span>{det.address}</span></div></div></div>
        {dst && 'online' in dst && dst.motd && <div className="motd">{dst.motd}</div>}
        <div className="kv"><span>Durum</span><b>{line(dst)}</b></div>
        {dst && 'online' in dst && dst.online && <>
          <div className="kv"><span>Oyuncu</span><b>{dst.players ?? '?'} / {dst.max ?? '?'}</b></div>
          <div className="kv"><span>Sunucu sürümü</span><b>{dst.version ?? 'bilinmiyor'}</b></div>
          <div className="kv"><span>Gecikme</span><b>{dst.latency} ms</b></div>
          {dst.version && !dst.version.includes(g.ver) && <p className="st">Seçili sürüm ({g.ver}) sunucu sürümüyle eşleşmeyebilir; gerekirse Ana sayfada değiştir.</p>}</>}
        {det.desc && <div className="motd">{det.desc}</div>}
        <div className="acts"><button className="btn g" onClick={() => setModal({ kind: 'edit', srv: det })}>Düzenle</button><button className="btn g" onClick={() => remove(det)}>Sil</button>
          <button className="btn" disabled={!canJoin || !(dst && 'online' in dst && dst.online)} onClick={() => join(det)}>KATIL</button></div>
      </div></div>}
    </section>
  )
}
