import { useEffect, useState } from 'react'

const TYPE = { release: 'Kararlı', beta: 'Beta', alpha: 'Alfa' }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Kurmadan önce sürüm seçimi: mod için profile uyumlu sürümler, mod paketi için paketin kendi sürümleri
export default function VersionPicker({ title, note, versions, recommended, busy, onInstall, onClose }: {
  title: string; note: string; versions: ModVersion[] | null; recommended: string | null; busy: boolean; onInstall: (id: string) => void; onClose: () => void }) {
  const [sel, setSel] = useState('')
  useEffect(() => { if (versions && !sel) setSel(recommended ?? versions[0]?.id ?? '') }, [versions])
  return (
    <div className="ov" onClick={onClose}><div className="mdl f" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
      <h3>{title}</h3><p className="st" style={{ margin: 0 }}>{note}</p>
      {!versions ? <div className="spin" style={{ alignSelf: 'center' }} />
        : !versions.length ? <p className="st">Uyumlu sürüm bulunamadı.</p>
        : <select className="fi" value={sel} onChange={e => setSel(e.target.value)}>{versions.map(v => <option key={v.id} value={v.id}>
            {v.number} · {TYPE[v.type]} · MC {v.mc.join(', ')}{v.loaders.length ? ' · ' + v.loaders.map(cap).join('/') : ''}{v.date ? ' · ' + v.date : ''}{v.id === recommended ? ' (önerilen)' : ''}</option>)}</select>}
      <p className="st" style={{ margin: 0 }}>Gerekli bağımlılıklar otomatik kurulur.</p>
      <div className="acts"><button className="btn g" onClick={onClose}>İptal</button><button className="btn" disabled={!sel || busy} onClick={() => onInstall(sel)}>{busy ? 'KURULUYOR…' : 'KUR'}</button></div>
    </div></div>
  )
}
