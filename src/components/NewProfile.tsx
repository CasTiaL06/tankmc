import { useState } from 'react'

const LD: [string, string][] = [['fabric', 'Fabric'], ['forge', 'Forge'], ['neoforge', 'NeoForge'], ['quilt', 'Quilt']]
export default function NewProfile({ vers, onCreate, onClose }: { vers: string[]; onCreate: (n: string, mc: string, ld: string) => void; onClose: () => void }) {
  const [name, setName] = useState(''), [mc, setMc] = useState(vers[0] ?? ''), [ld, setLd] = useState('fabric')
  return (
    <div className="ov" onClick={onClose}><div className="mdl f" onClick={e => e.stopPropagation()}>
      <h3>Yeni profil</h3>
      <input className="fi" placeholder="Profil adı" maxLength={40} value={name} onChange={e => setName(e.target.value)} />
      {vers.length ? <select className="fi" value={mc} onChange={e => setMc(e.target.value)}>{vers.map(v => <option key={v}>{v}</option>)}</select>
        : <input className="fi" placeholder="Minecraft sürümü (örn. 1.21.4)" value={mc} onChange={e => setMc(e.target.value)} />}
      <select className="fi" value={ld} onChange={e => setLd(e.target.value)}>{LD.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <div className="acts"><button className="btn g" onClick={onClose}>İptal</button><button className="btn" disabled={!name.trim() || !mc.trim()} onClick={() => onCreate(name, mc.trim(), ld)}>OLUŞTUR</button></div>
    </div></div>
  )
}
