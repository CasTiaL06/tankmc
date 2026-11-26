import { useEffect, useState } from 'react'

export interface Upd { state: UpdateState; statusText: string; check(): Promise<void>; download(): Promise<void>; apply(): Promise<void>; notes(): void }
const INIT: UpdateState = { phase: 'idle', current: '', mode: 'installed', repoSet: false }

export function useUpdate(): Upd {
  const api = window.tank?.update
  const [state, setState] = useState<UpdateState>(INIT)
  useEffect(() => { if (!api) return; api.state().then(r => { if (r.ok) setState(r.state) }); return api.onState(setState) }, [])
  const s = state
  const statusText = !api ? 'Güncelleme yalnızca masaüstü uygulamasında çalışır'
    : !s.repoSet ? 'Güncelleme deposu tanımlı değil (README)'
    : s.phase === 'checking' ? 'Kontrol ediliyor…' : s.phase === 'available' ? `Yeni sürüm var: v${s.version}${s.prerelease ? ' (beta)' : ''}`
    : s.phase === 'downloading' ? 'Güncelleme indiriliyor…' : s.phase === 'ready' ? 'Güncelleme hazır; yeniden başlatınca kurulur'
    : s.phase === 'uptodate' ? `Güncelsin (v${s.current})` : s.phase === 'error' ? (s.error ?? 'Hata') : `Sürüm v${s.current}`
  return {
    state, statusText,
    check: async () => { const r = await api?.check(); if (r && !r.ok) setState(o => ({ ...o, phase: 'error', error: r.error })) },
    download: async () => { const r = await api?.download(); if (r && !r.ok) setState(o => ({ ...o, error: r.error })) },
    apply: async () => { const r = await api?.apply(); if (r && !r.ok) setState(o => ({ ...o, phase: 'error', error: r.error })) },
    notes: () => { void api?.notes() },
  }
}
