import type { Dl } from '../lib/useDownloads'
import { fmtBytes, fmtDur, fmtEta, fmtSpeed } from '../lib/fmt'

const KIND = { game: 'Minecraft', mod: 'Mod', pack: 'Mod paketi', update: 'Güncelleme' }
const when = (t: number) => new Date(t).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })

export default function Downloads({ dl }: { dl: Dl }) {
  const past = dl.tasks.filter(t => t.state !== 'active')
  return (
    <section className="view on">
      <h1>İndirmeler</h1><p className="sub">Minecraft, mod ve mod paketi indirmeleri</p>
      <h2 className="sec">Aktif indirmeler</h2>
      {!dl.active.length && <div className="empty">Şu anda aktif indirme yok.</div>}
      {dl.active.map(t => { const pct = t.total > 0 ? Math.min(100, (t.done / t.total) * 100) : null; return (
        <div className="mrow" key={t.id} style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div className="row"><b style={{ flex: 1 }}>{t.title}</b><span className="chips"><span>{KIND[t.kind]}</span></span><button className="btn g" style={{ minWidth: 0 }} onClick={() => dl.cancel(t.id)}>İptal</button></div>
          <div className={'dbar' + (pct === null ? ' ind' : '')}><i style={pct === null ? undefined : { width: pct + '%' }} /></div>
          <div className="st" style={{ margin: 0 }}>{pct === null ? 'Hazırlanıyor…' : `%${pct.toFixed(0)}`} · {fmtBytes(t.done)}{t.total ? ` / ${fmtBytes(t.total)}` : ''} · {fmtSpeed(t.speed)} · kalan {fmtEta(t.eta)} · {t.filesDone}/{t.files || '?'} dosya</div>
        </div>) })}
      <h2 className="sec">Geçmiş</h2>
      {!past.length && <div className="empty">Henüz tamamlanan indirme yok.</div>}
      {past.map(t => (
        <div className="mrow" key={t.id} style={{ cursor: 'default' }}>
          <div className="mt"><b>{t.title}</b><span>{KIND[t.kind]} · {t.endedAt ? when(t.endedAt) : ''}{t.endedAt ? ` · ${fmtDur(t.endedAt - t.startedAt)}` : ''}{t.done ? ` · ${fmtBytes(t.done)}` : ''}</span>
            {t.state === 'error' && t.error && <span style={{ color: '#ff6b6b' }}>{t.error}</span>}</div>
          <span className={t.state === 'done' ? 'upb' : 'st'} style={{ color: t.state === 'error' ? '#ff6b6b' : undefined }}>{t.state === 'done' ? '✓ Tamamlandı' : t.state === 'cancelled' ? 'İptal edildi' : '✗ Hata'}</span>
        </div>))}
      {!!past.length && <button className="btn g" onClick={dl.clear}>GEÇMİŞİ TEMİZLE</button>}
    </section>
  )
}
