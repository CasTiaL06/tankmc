import { useState } from 'react'
import type { Upd } from '../lib/useUpdate'

// Yeni sürüm bildirimi: indirme kullanıcı onayıyla başlar; kurulum/yeniden başlatma da ayrıca onay ister.
export default function UpdateBanner({ upd }: { upd: Upd }) {
  const [hidden, setHidden] = useState<string | null>(null)
  const s = upd.state
  if (!['available', 'downloading', 'ready'].includes(s.phase) || hidden === s.version) return null
  return (
    <div className="upd">
      {s.phase === 'available' && <>
        <b>TankClient v{s.version}{s.prerelease ? ' (beta)' : ''} hazır.</b>
        {s.canAuto ? <button className="btn" onClick={() => void upd.download()}>GÜNCELLE</button> : <span className="st">Bu sürümde {s.mode === 'portable' ? 'portable' : 'kurulum'} dosyası yok.</span>}
        <a className="lnk" onClick={upd.notes}>Sürüm sayfası</a>
        <a className="lnk" style={{ marginLeft: 'auto' }} onClick={() => setHidden(s.version ?? null)}>Sonra</a>
        {s.error && <span style={{ color: '#ff6b6b' }}>{s.error}</span>}</>}
      {s.phase === 'downloading' && <><b>Güncelleme indiriliyor…</b><span className="st">İlerlemeyi İndirmeler sayfasından takip edebilirsin.</span></>}
      {s.phase === 'ready' && <>
        <b>Güncelleme indirildi ve doğrulandı.</b>
        <span className="st">{s.mode === 'portable' ? 'TankClient kapanır ve yeni sürüm açılır; verilerin (TankClient-Data) korunur.' : 'TankClient kapanır ve kurulum sihirbazı açılır; verilerin korunur.'}</span>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => void upd.apply()}>YENİDEN BAŞLAT</button></>}
    </div>
  )
}
