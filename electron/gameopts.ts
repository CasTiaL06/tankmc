import fs from 'fs'
import path from 'path'

// Minecraft'ın options.txt dosyasında yalnızca verilen anahtarları günceller; diğer satırlara dokunmaz.
const KEY = /^[A-Za-z][A-Za-z0-9_.]{0,40}$/, VAL = /^[\w.\-]{1,40}$/
export function patchOptions(text: string, kv: Record<string, string>): string {
  for (const [k, v] of Object.entries(kv)) if (!KEY.test(k) || !VAL.test(v)) throw new Error('Geçersiz oyun ayarı: ' + k)
  const seen = new Set<string>()
  const out = (text === '' ? [] : text.split(/\r?\n/)).map(l => {
    const i = l.indexOf(':'), k = i > 0 ? l.slice(0, i) : ''
    if (k && Object.prototype.hasOwnProperty.call(kv, k)) { seen.add(k); return `${k}:${kv[k]}` }
    return l
  })
  while (out.length && out[out.length - 1] === '') out.pop()
  for (const k of Object.keys(kv)) if (!seen.has(k)) out.push(`${k}:${kv[k]}`)
  return out.join('\n') + '\n'
}
export function applyOptions(dir: string, kv: Record<string, string>) {
  fs.mkdirSync(dir, { recursive: true })
  const f = path.join(dir, 'options.txt'); let cur = ''
  try { cur = fs.readFileSync(f, 'utf8') } catch { /* henüz yok: oyun ilk açılışta oluşturur */ }
  const next = patchOptions(cur, kv)
  if (next !== cur) { const t = f + '.tmp'; fs.writeFileSync(t, next); fs.renameSync(t, f) }
}
