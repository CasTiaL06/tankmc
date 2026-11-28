import { useState } from 'react'
import type { Game } from '../lib/useGame'
import type { Dl } from '../lib/useDownloads'
import type { Profiles } from '../lib/useProfiles'
import type { Target } from '../lib/useTarget'
import { fmtSpeed } from '../lib/fmt'

// Alt çubuk: seçili sürüm/profilin durumu, gerçek indirme ilerlemesi ve hızlı başlatma
export default function Dock({ g, dl, p, t, go }: { g: Game; dl: Dl; p: Profiles; t: Target; go: (k: 'downloads') => void }) {
  const [open, setOpen] = useState(false)
  const act = dl.active.find(x => x.kind === 'game'), pct = act && act.total > 0 ? Math.min(100, (act.done / act.total) * 100) : null
  const pick = (id: string) => { t.set(id); setOpen(false) }
  const status = !window.tank ? 'Başlatma yalnızca masaüstü uygulamasında çalışır' : g.live ? `${t.label} · oyun açık` : g.busy ? `${t.label} hazırlanıyor…` : g.ver ? `${t.label} hazır` : 'Sürümler yükleniyor…'
  return (
    <footer className="dock">
      <svg className="cube" viewBox="0 0 44 44"><path d="M22 4l16 9v18l-16 9-16-9V13z" fill="#6b4a2b" /><path d="M22 4l16 9-16 9-16-9z" fill="#5da130" /><path d="M6 13l16 9v18L6 31z" fill="#7a5532" /><path d="M38 13l-16 9v18l16-9z" fill="#5b3d22" /></svg>
      <div className="dm"><b onClick={() => go('downloads')} style={{ cursor: 'pointer' }}>{status}</b>
        {g.busy && !g.live && <><div className={'dbar' + (pct === null ? ' ind' : '')}><i style={pct === null ? undefined : { width: pct + '%' }} /></div>
          <span className="st">{g.prog?.text ?? ''}{act && act.speed > 0 ? ` · ${fmtSpeed(act.speed)}` : ''}</span></>}</div>
      {g.busy && !g.live && act && <><span className="pct">{pct === null ? '' : `%${pct.toFixed(0)}`}</span><button className="btn g" style={{ minWidth: 0 }} onClick={() => dl.cancel(act.id)}>İPTAL</button></>}
      <div style={{ position: 'relative', display: 'flex', gap: 6 }}>
        <button className="play sm" onClick={t.play} disabled={g.busy}>{g.live ? 'OYUN AÇIK' : g.busy ? 'HAZIRLANIYOR' : 'OYUNU BAŞLAT'}</button>
        <button className="ib chev" title="Ne başlatılsın?" onClick={() => setOpen(o => !o)}><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg></button>
        {open && <><div className="pclose" onClick={() => setOpen(false)} /><div className="pop dockp">
          <h5>Başlatılacak</h5>
          <button className={'it' + (t.id === 'ver' ? ' on' : '')} onClick={() => pick('ver')}>Vanilla · Minecraft {g.ver}</button>
          {(p.insts ?? []).map(i => <button key={i.id} className={'it' + (t.id === i.id ? ' on' : '')} onClick={() => pick(i.id)}>{i.name} · {i.loader} {i.mc}</button>)}
        </div></>}
      </div>
    </footer>
  )
}
