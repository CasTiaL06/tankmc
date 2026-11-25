import { Dispatch, SetStateAction, useEffect, useState } from 'react'

export interface Profiles {
  insts: Inst[] | null; setInsts: Dispatch<SetStateAction<Inst[] | null>>
  selId: string; setSelId(id: string): void
  create(name: string, mc: string, loader: string): Promise<string | null>
  remove(id: string): Promise<string | null>
}
const ls = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const lset = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* yok say */ } }

// Profil listesi uygulama düzeyinde: kenar çubuğu, Kütüphane ve Mod Kütüphanesi aynı veriyi kullanır. Hata varsa mesaj döner.
export function useProfiles(): Profiles {
  const api = window.tank?.mods
  const [insts, setInsts] = useState<Inst[] | null>(null), [selId, setSel] = useState(ls('tc.inst') ?? '')
  useEffect(() => { api?.instances().then(r => { if (r.ok) setInsts(r.instances) }) }, [])
  return {
    insts, setInsts, selId,
    setSelId: id => { setSel(id); lset('tc.inst', id) },
    create: async (n, mc, ld) => {
      if (!api) return 'Profiller yalnızca masaüstü uygulamasında kullanılabilir.'
      const r = await api.create(n, mc, ld); if (!r.ok) return r.error
      setInsts(l => [...(l ?? []), r.instance]); setSel(r.instance.id); lset('tc.inst', r.instance.id); return null
    },
    remove: async id => {
      const r = await window.tank?.mods.remove(id); if (!r || !r.ok) return r ? r.error : 'Silinemedi.'
      setInsts(l => (l ?? []).filter(x => x.id !== id)); return null
    },
  }
}
