import fs from 'fs'
import path from 'path'

export const NEW_PORTABLE_DIR = 'TankClient-Data'
export const OLD_PORTABLE_DIR = 'TANKmc-Data'
export interface DataInfo { mode: 'portable' | 'installed'; dir: string; migratedFrom?: string; migrationError?: string }
export interface DataEnv { portableDir?: string; appData: string }

const isDir = (p: string) => { try { return fs.statSync(p).isDirectory() } catch { return false } }
const same = (a: string, b: string) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase()

// Eski klasörü KOPYALAR; eskisini asla silmez veya taşımaz. Hedef zaten varsa hiçbir şeye dokunmaz.
// Kopya önce '.migrating' klasörüne yapılır, tamamlanınca yeniden adlandırılır; yarım kalırsa sonraki açılışta yeniden denenir.
function migrate(oldDirs: string[], target: string): Pick<DataInfo, 'migratedFrom' | 'migrationError'> {
  if (fs.existsSync(target)) return {}
  const src = oldDirs.find(d => isDir(d) && !same(d, target))
  if (!src) return {}
  const tmp = target + '.migrating'
  try {
    fs.rmSync(tmp, { recursive: true, force: true })
    fs.cpSync(src, tmp, { recursive: true })
    fs.writeFileSync(path.join(tmp, 'migrated-from.txt'), `${src}\n${new Date().toISOString()}\n`)
    fs.renameSync(tmp, target)
    return { migratedFrom: src }
  } catch (e) { return { migrationError: String((e as Error)?.message ?? e) } }
}

export function resolveDataDir(env: DataEnv): DataInfo {
  if (env.portableDir) {
    const dir = path.join(env.portableDir, NEW_PORTABLE_DIR)
    const m = migrate([path.join(env.portableDir, OLD_PORTABLE_DIR)], dir)
    try { fs.mkdirSync(dir, { recursive: true }); return { mode: 'portable', dir, ...m } } catch { /* exe klasörü yazılamıyor: AppData düzenine düş */ }
  }
  const dir = path.join(env.appData, 'TankClient')
  const m = migrate([path.join(env.appData, 'TANKmc'), path.join(env.appData, 'tankmc')], dir)
  fs.mkdirSync(dir, { recursive: true })
  return { mode: 'installed', dir, ...m }
}
