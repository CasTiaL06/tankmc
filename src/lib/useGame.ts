import { useEffect, useRef, useState } from 'react'

export interface Game {
  vers: string[]; ver: string; setVer(v: string): void
  busy: boolean; live: boolean; prog: { text: string; pct: number } | null; last: string | null
  play(address?: string): Promise<void>
}
const ls = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const lset = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* yok say */ } }

// Oyun durumu uygulama düzeyinde tutulur: sayfa değişse de ilerleme ve hata bildirimleri kaybolmaz.
export function useGame(toast: (m: string) => void): Game {
  const api = window.tank?.game
  const [vers, setVers] = useState<string[]>([]), [ver, setVerS] = useState(ls('tc.ver') ?? '')
  const [last, setLast] = useState<string | null>(ls('tc.last'))
  const [busy, setBusy] = useState(false), [live, setLive] = useState(false), [prog, setProg] = useState<{ text: string; pct: number } | null>(null)
  const verRef = useRef(ver); verRef.current = ver
  useEffect(() => {
    if (!api) return
    api.versions().then(r => { if (r.ok) { setVers(r.versions); setVerS(v => (r.versions.includes(v) ? v : r.versions[0])) } else toast(r.error) })
    const offs = [api.onProgress(setProg), api.onState(s => {
      if (s.state === 'preparing') setBusy(true)
      if (s.state === 'running') { setLive(true); setProg(null); const l = `Vanilla ${verRef.current}`; setLast(l); lset('tc.last', l) }
      if (s.state === 'exited' || s.state === 'error') { setBusy(false); setLive(false); setProg(null); if (s.message) toast(s.message) }
    })]
    return () => offs.forEach(f => f())
  }, [])
  return {
    vers, ver, busy, live, prog, last,
    setVer: v => { setVerS(v); lset('tc.ver', v) },
    play: async address => {
      if (!api) return toast('Oyun başlatma yalnızca masaüstü uygulamasında çalışır.')
      if (!ver) return toast('Sürüm listesi henüz yüklenmedi.')
      const r = await api.play(ver, address)
      if (!r.ok) toast(r.error ?? 'Başlatılamadı.')
    },
  }
}
