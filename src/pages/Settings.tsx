import { useEffect, useRef, useState } from 'react'

const TABS = ['Oyun', 'Java', 'Klasörler', 'Görünüm', 'Launcher'] as const
const RES = ['1280x720', '1600x900', '1920x1080', '2560x1440']
const Toggle = ({ on, set }: { on: boolean; set?: (v: boolean) => void }) =>
  <div className={'tg' + (on ? ' on' : '')} style={set ? undefined : { opacity: .4, pointerEvents: 'none' }} onClick={() => set?.(!on)} />
const Row = ({ t, s, children }: { t: string; s?: string; children: React.ReactNode }) =>
  <div className="set"><div>{t}{s && <small>{s}</small>}</div>{children}</div>

import type { Upd } from '../lib/useUpdate'
import PageHead from '../components/PageHead'

export default function Settings({ upd }: { upd: Upd }) {
  const api = window.tank?.settings
  const [tab, setTab] = useState<typeof TABS[number]>('Oyun')
  const [s, setS] = useState<AppSettings | null>(null), [maxRam, setMaxRam] = useState(16384), [defDir, setDefDir] = useState('')
  const timer = useRef<number>()
  useEffect(() => {
    api?.get().then(r => { setS(r.settings); setMaxRam(r.maxRamMb); setDefDir(r.defaultGameDir) })
    return () => clearTimeout(timer.current)
  }, [])
  if (!api) return <section className="view on"><PageHead title="Ayarlar" sub="Ayarlar yalnızca masaüstü uygulamasında kullanılabilir." /></section>
  if (!s) return <section className="view on"><h1>Ayarlar</h1></section>
  const up = (p: Partial<AppSettings>) => {
    const n = { ...s, ...p }; setS(n)
    clearTimeout(timer.current); timer.current = window.setTimeout(() => { void api.set(n) }, 300)
  }
  const pickJava = async () => { const p = await api.pick('java'); if (p) up({ javaPath: p }) }
  const pickDir = async () => { const p = await api.pick('folder'); if (p) up({ gameDir: p }) }
  const gb = s.ramMb / 1024
  const note = gb < 3 ? 'Düşük: büyük paketlerde yetersiz kalabilir' : gb > 12 ? 'Yüksek: gereksiz olabilir' : 'Önerilen: 4–6 GB'
  const resList = RES.includes(s.resolution) ? RES : [s.resolution, ...RES]
  return (
    <section className="view on">
      <PageHead title="Ayarlar" sub="Değişiklikler otomatik kaydedilir ve sonraki oyun başlatmada uygulanır" />
      <div className="tabs">{TABS.map(t => <button key={t} className={'fc' + (t === tab ? ' on' : '')} onClick={() => setTab(t)}>{t}</button>)}</div>
      <div className="pane on" key={tab}>
        {tab === 'Oyun' && <>
          <Row t="Ayrılan RAM" s={note}><div className="row"><input type="range" min={2048} max={maxRam} step={512} value={Math.min(s.ramMb, maxRam)} onChange={e => up({ ramMb: +e.target.value })} /><b style={{ width: 56 }}>{+gb.toFixed(1)} GB</b></div></Row>
          <Row t="Çözünürlük" s="Oyun penceresi boyutu"><select value={s.resolution} onChange={e => up({ resolution: e.target.value })}>{resList.map(r => <option key={r} value={r}>{r.replace('x', '×')}</option>)}</select></Row>
          <Row t="Tam ekran" s="Oyunu tam ekran başlat"><Toggle on={s.fullscreen} set={v => up({ fullscreen: v })} /></Row>
          <Row t="Görüş mesafesini TankClient yönetsin" s="Kapalıyken oyunun kendi ayarı kullanılır"><Toggle on={s.renderDistance > 0} set={v => up({ renderDistance: v ? 12 : 0 })} /></Row>
          {s.renderDistance > 0 && <Row t="Görüş mesafesi" s="Her başlatmada uygulanır; oyunda değiştirdiğin değerin üstüne yazılır. Vanilla en fazla 32 chunk destekler; daha uzağı için Mod Kütüphanesi'ndeki Uzak Görüş (LOD) modunu kullan."><div className="row"><input type="range" min={2} max={32} step={1} value={s.renderDistance} onChange={e => up({ renderDistance: +e.target.value })} /><b style={{ width: 84 }}>{s.renderDistance} chunk</b></div></Row>}</>}
        {tab === 'Java' && <>
          <Row t="Java’yı otomatik yönet" s="Sürüme uygun Mojang Java’sı indirilir"><Toggle on={s.javaAuto} set={v => up({ javaAuto: v })} /></Row>
          {!s.javaAuto && <Row t="Java yolu" s="Oyun sürümüne uygun bir java.exe seç"><div className="row"><input type="text" readOnly title={s.javaPath} value={s.javaPath || 'Seçilmedi'} /><button className="btn g" onClick={pickJava}>Seç…</button></div></Row>}</>}
        {tab === 'Klasörler' && <>
          <Row t="Minecraft klasörü" s="Yeni dosyalar buraya indirilir; mevcut dosyalar taşınmaz"><div className="row"><input type="text" readOnly title={s.gameDir || defDir} value={s.gameDir || defDir} /><button className="btn g" onClick={pickDir}>Seç…</button>{s.gameDir && <button className="btn g" onClick={() => up({ gameDir: '' })}>Varsayılan</button>}</div></Row></>}
        {tab === 'Görünüm' && <>
          <Row t="Arayüz boyutu" s="Uygulama çok büyük veya küçük görünüyorsa değiştir; hemen uygulanır"><div className="row"><input type="range" min={70} max={120} step={5} value={s.uiScale} onChange={e => up({ uiScale: +e.target.value })} /><b style={{ width: 52 }}>%{s.uiScale}</b></div></Row>
          <Row t="Açıklamaları Türkçeye çevir" s="Mod açıklamaları ve Minecraft haberleri ücretsiz bir çeviri servisiyle (MyMemory) çevrilir; günlük sınırı vardır ve çeviri hatalı olabilir. Kapalıyken özgün metin gösterilir."><Toggle on={s.translate} set={v => up({ translate: v })} /></Row></>}
        {tab === 'Launcher' && <>
          <Row t="Otomatik güncelleme" s="Açılışta yeni sürüm olup olmadığını kontrol eder (GitHub Releases)"><Toggle on={s.autoUpdate} set={v => up({ autoUpdate: v })} /></Row>
          <Row t="Beta sürümlerini dahil et" s="Önizleme (pre-release) sürümleri de önerilir"><Toggle on={s.betaUpdates} set={v => up({ betaUpdates: v })} /></Row>
          <Row t="Güncellemeler" s={upd.statusText}><button className="btn g" disabled={upd.state.phase === 'checking' || upd.state.phase === 'downloading' || !upd.state.repoSet} onClick={() => void upd.check()}>ŞİMDİ KONTROL ET</button></Row>
          <Row t="Oyun açılınca küçült" s="Oyun kapanınca launcher geri gelir"><Toggle on={s.minimizeOnLaunch} set={v => up({ minimizeOnLaunch: v })} /></Row>
          <Row t="Windows ile başlat" s={upd.state.mode === 'portable' ? 'Taşınabilir (portable) sürümde desteklenmez; kurulumlu sürümde çalışır' : 'Bilgisayar açılınca TankClient kendiliğinden başlar'}>{upd.state.mode === 'portable' ? <Toggle on={false} /> : <Toggle on={s.startWithWindows} set={v => up({ startWithWindows: v })} />}</Row></>}
      </div>
    </section>
  )
}
