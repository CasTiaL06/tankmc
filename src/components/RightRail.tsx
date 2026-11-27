import { useEffect, useState } from 'react'
import type { Page } from '../lib/nav'
import { ICONS } from '../lib/icons'
import { daysAgo } from '../lib/labels'

// Sağ sütun: yalnızca gerçek veri (Mojang sürüm notları, Modrinth'in son güncellenen modları)
export default function RightRail({ kind, go }: { kind: 'home' | 'mods'; go: (p: Page) => void }) {
  const [news, setNews] = useState<NewsItem[]>([]), [ups, setUps] = useState<ModHit[]>([])
  useEffect(() => {
    window.tank?.news.get().then(r => { if (r.ok) setNews(r.news) })
    window.tank?.mods.search({ query: '', type: 'mod', sort: 'updated' }).then(r => { if (r.ok) setUps(r.hits.slice(0, 4)) })
  }, [])
  return (
    <aside className="rail2">
      {kind === 'home' && news.length > 0 && <div className="wd"><h4>Duyurular</h4>
        {news.slice(0, 2).map(n => <div key={n.version + n.title} className="nw">{n.image && <img alt="" src={n.image} />}<b>{n.title}</b><p>{n.text}</p><span className="st">{n.date ?? ''}</span></div>)}</div>}
      {ups.length > 0 && <div className="wd"><h4>Son güncellenenler<a className="lnk" onClick={() => go('packs')}>Tümü →</a></h4>
        {ups.map(h => <div key={h.id} className="wr">{h.icon ? <img className="th s" alt="" src={h.icon} /> : <span className="th s" />}<div className="mt"><b>{h.title}</b><span>{h.desc}</span><span className="st">{daysAgo(h.updated)}</span></div></div>)}</div>}
      {kind === 'mods' && <div className="wd"><h4>Hızlı erişim</h4>
        <div className="qg">{([['library', 'Kütüphane'], ['servers', 'Sunucular'], ['settings', 'Ayarlar'], ['downloads', 'İndirmeler']] as const).map(([k, v]) => <button key={k} className="qt s" onClick={() => go(k)}><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICONS[k] }} />{v}</button>)}</div></div>}
      {kind === 'mods' && <div className="wd quote"><span>“</span>Oyun seninle daha güzel.<small>— TankClient</small></div>}
    </aside>
  )
}
