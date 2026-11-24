import { useState } from 'react'

const TABS = ['Oyun', 'Java', 'Klasörler', 'Launcher'] as const
const Toggle = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => <div className={'tg' + (on ? ' on' : '')} onClick={() => set(!on)} />

const Row = ({ t, s, children }: { t: string; s?: string; children: React.ReactNode }) => <div className="set"><div>{t}{s && <small>{s}</small>}</div>{children}</div>

export default function Settings() {
  const [tab, setTab] = useState<typeof TABS[number]>('Oyun')
  const [ram, setRam] = useState(4), [res, setRes] = useState('1920×1080'), [full, setFull] = useState(false)
  const [auto, setAuto] = useState(true), [jp, setJp] = useState('C:\\Program Files\\Java\\bin\\javaw.exe')
  const [upd, setUpd] = useState(true), [min, setMin] = useState(false), [boot, setBoot] = useState(false)
  const note = ram < 3 ? 'Düşük: büyük paketlerde yetersiz kalabilir' : ram > 12 ? 'Yüksek: gereksiz olabilir' : 'Önerilen: 4–6 GB'
  return (
    <section className="view on">
      <h1>Ayarlar</h1><p className="sub">Launcher ve oyun tercihleri</p>
      <div className="tabs">{TABS.map(t => <button key={t} className={'fc' + (t === tab ? ' on' : '')} onClick={() => setTab(t)}>{t}</button>)}</div>
      <div className="pane on" key={tab}>
        {tab === 'Oyun' && <>
          <Row t="Ayrılan RAM" s={note}><div className="row"><input type="range" min={2} max={16} value={ram} onChange={e => setRam(+e.target.value)} /><b style={{ width: 48 }}>{ram} GB</b></div></Row>
          <Row t="Çözünürlük" s="Oyun penceresi boyutu"><select value={res} onChange={e => setRes(e.target.value)}>{['1280×720', '1600×900', '1920×1080'].map(r => <option key={r}>{r}</option>)}</select></Row>
          <Row t="Tam ekran" s="Oyunu tam ekran başlat"><Toggle on={full} set={setFull} /></Row></>}
        {tab === 'Java' && <>
          <Row t="Java’yı otomatik yönet" s="Sürüme uygun Java indirilir"><Toggle on={auto} set={setAuto} /></Row>
          <Row t="Java yolu" s="Otomatik açıkken devre dışı"><input type="text" disabled={auto} value={auto ? 'Otomatik' : jp} onChange={e => setJp(e.target.value)} /></Row></>}
        {tab === 'Klasörler' && <>
          <Row t="Minecraft klasörü"><input type="text" defaultValue="%APPDATA%\TankClient" /></Row>
          <Row t="İndirme klasörü"><input type="text" defaultValue="%APPDATA%\TankClient\downloads" /></Row></>}
        {tab === 'Launcher' && <>
          <Row t="Otomatik güncelleme" s="Yeni sürümleri bildir ve indir"><Toggle on={upd} set={setUpd} /></Row>
          <Row t="Oyun açılınca küçült"><Toggle on={min} set={setMin} /></Row>
          <Row t="Windows ile başlat"><Toggle on={boot} set={setBoot} /></Row></>}
      </div>
    </section>
  )
}
