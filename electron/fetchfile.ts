import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fetchBuffer } from './fetchbytes'

export const sha1Buf = (b: Buffer) => crypto.createHash('sha1').update(b).digest('hex')
const sha1File = (f: string) => new Promise<string>((res, rej) => { const h = crypto.createHash('sha1'); fs.createReadStream(f).on('data', d => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej) })
// Dosya zaten varsa ve geçerliyse boyutunu döndürür. Boyut biliniyorsa yalnızca boyut karşılaştırılır (indirirken zaten SHA1 ile
// doğrulanmıştı; her açılışta binlerce dosyanın özetini hesaplamak kasmaya yol açıyordu). Boyut bilinmiyorsa özet eşzamansız hesaplanır.
async function have(dest: string, hash?: string, size?: number): Promise<number | null> {
  let st; try { st = await fs.promises.stat(dest) } catch { return null }
  if (size && size > 0) return st.size === size ? st.size : null
  return !hash || (await sha1File(dest)) === hash ? st.size : null
}
export interface DlOpts { hash?: string; size?: number; signal?: AbortSignal; onBytes?: (n: number) => void; retries?: number; delayMs?: number }
export async function downloadFile(url: string, dest: string, o: DlOpts = {}): Promise<{ cached: boolean; bytes: number }> {
  const c = await have(dest, o.hash, o.size); if (c !== null) return { cached: true, bytes: c }
  const buf = await fetchBuffer(url, { signal: o.signal, onBytes: o.onBytes, retries: o.retries, delayMs: o.delayMs, label: path.basename(dest),
    verify: b => { if (o.hash && sha1Buf(b) !== o.hash) throw new Error('SHA1 doğrulaması başarısız') } })
  await fs.promises.mkdir(path.dirname(dest), { recursive: true })
  const tmp = dest + '.part'; await fs.promises.writeFile(tmp, buf); await fs.promises.rename(tmp, dest)
  return { cached: false, bytes: buf.length }
}
