import fs from 'fs'
import path from 'path'

export interface Settings { ramMb: number; resolution: string; fullscreen: boolean; javaAuto: boolean; javaPath: string; gameDir: string; minimizeOnLaunch: boolean }
export const DEFAULTS: Settings = { ramMb: 4096, resolution: '1920x1080', fullscreen: false, javaAuto: true, javaPath: '', gameDir: '', minimizeOnLaunch: false }

// Renderer'dan veya diskten gelen her değer burada doğrulanır; geçersiz alan varsayılana döner.
export function sanitize(raw: unknown, maxRamMb = 32768): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = DEFAULTS
  const ram = typeof r.ramMb === 'number' && Number.isFinite(r.ramMb) ? Math.round(r.ramMb / 256) * 256 : d.ramMb
  const str = (v: unknown) => (typeof v === 'string' && v.length <= 260 ? v : '')
  const dir = str(r.gameDir)
  return {
    ramMb: Math.min(Math.max(ram, 1024), Math.max(1024, maxRamMb)),
    resolution: typeof r.resolution === 'string' && /^\d{3,5}x\d{3,5}$/.test(r.resolution) ? r.resolution : d.resolution,
    fullscreen: r.fullscreen === true,
    javaAuto: r.javaAuto !== false,
    javaPath: str(r.javaPath),
    gameDir: dir === '' || path.isAbsolute(dir) ? dir : '',
    minimizeOnLaunch: r.minimizeOnLaunch === true,
  }
}
const file = (dir: string) => path.join(dir, 'settings.json')
export function load(dir: string): Settings {
  try { return sanitize(JSON.parse(fs.readFileSync(file(dir), 'utf8'))) } catch { return { ...DEFAULTS } }
}
export function save(dir: string, s: Settings) {
  fs.mkdirSync(dir, { recursive: true })
  const tmp = file(dir) + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2)); fs.renameSync(tmp, file(dir))
}
