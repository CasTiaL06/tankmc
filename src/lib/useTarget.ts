import { useState } from 'react'
import type { Game } from './useGame'
import type { Profiles } from './useProfiles'

const ls = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
export interface Target { id: string; inst: Inst | undefined; label: string; set(id: string): void; play(): void }
// Ne başlatılacağı (Vanilla sürümü veya bir profil) uygulama düzeyinde: Ana sayfa ve alt çubuk aynı seçimi kullanır
export function useTarget(g: Game, p: Profiles): Target {
  const [id, setId] = useState(ls('tc.dock') ?? 'ver')
  const inst = id === 'ver' ? undefined : p.insts?.find(i => i.id === id)
  return {
    id: inst ? id : 'ver', inst,
    label: inst ? `${inst.name} · MC ${inst.mc}` : `Minecraft ${g.ver}`.trim(),
    set: v => { setId(v); try { localStorage.setItem('tc.dock', v) } catch { /* yok say */ } },
    play: () => { if (inst) void g.play(undefined, { version: inst.mc, profileId: inst.id, name: inst.name }); else void g.play() },
  }
}
