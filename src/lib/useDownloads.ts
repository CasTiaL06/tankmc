import { useEffect, useState } from 'react'

export interface Dl { tasks: DlTask[]; active: DlTask[]; cancel(id: string): void; clear(): void }
// İndirme listesi uygulama düzeyinde: menü rozeti, Ana sayfa ve İndirmeler sayfası aynı veriyi kullanır.
export function useDownloads(): Dl {
  const api = window.tank?.downloads
  const [tasks, setTasks] = useState<DlTask[]>([])
  useEffect(() => {
    if (!api) return
    api.list().then(r => { if (r.ok) setTasks(r.tasks) })
    return api.onUpdate(setTasks)
  }, [])
  return { tasks, active: tasks.filter(t => t.state === 'active'), cancel: id => { void api?.cancel(id) }, clear: () => { void api?.clear() } }
}
