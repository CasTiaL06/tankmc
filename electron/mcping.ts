import net from 'net'
import dns from 'dns'

export interface PingResult { online: boolean; players?: number; max?: number; version?: string; motd?: string; favicon?: string; latency?: number; error?: string }

// Minecraft Java "Server List Ping" (1.7+): handshake + status isteği. Üçüncü taraf servis kullanılmaz.
export const varint = (n: number) => { const b: number[] = []; do { let x = n & 0x7f; n >>>= 7; if (n) x |= 0x80; b.push(x) } while (n); return Buffer.from(b) }
export function readVarInt(buf: Buffer, off = 0): { value: number; size: number } | null {
  let v = 0
  for (let i = 0; i < 5; i++) {
    if (off + i >= buf.length) return null
    const b = buf[off + i]; v |= (b & 0x7f) << (7 * i)
    if (!(b & 0x80)) return { value: v, size: i + 1 }
  }
  throw new Error('VarInt çok uzun')
}
const str = (s: string) => { const b = Buffer.from(s, 'utf8'); return Buffer.concat([varint(b.length), b]) }
export const pkt = (id: number, data: Buffer = Buffer.alloc(0)) => { const body = Buffer.concat([varint(id), data]); return Buffer.concat([varint(body.length), body]) }

export function motdText(d: unknown): string {
  if (typeof d === 'string') return d.replace(/§./g, '')
  if (Array.isArray(d)) return d.map(motdText).join('')
  if (d && typeof d === 'object') { const o = d as { text?: unknown; extra?: unknown }; return motdText(o.text ?? '') + (Array.isArray(o.extra) ? o.extra.map(motdText).join('') : '') }
  return ''
}
export function parseStatus(buf: Buffer): { json: any } | null {
  const len = readVarInt(buf, 0)
  if (!len || buf.length < len.size + len.value) return null
  const body = buf.subarray(len.size, len.size + len.value)
  const id = readVarInt(body, 0), sl = id && readVarInt(body, id.size)
  if (!id || !sl || id.value !== 0) throw new Error('Beklenmeyen paket')
  return { json: JSON.parse(body.subarray(id.size + sl.size, id.size + sl.size + sl.value).toString('utf8')) }
}
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const errText = (e: NodeJS.ErrnoException) => e.code === 'ECONNREFUSED' ? 'Bağlantı reddedildi' : e.code === 'ENOTFOUND' || e.code === 'EAI_AGAIN' ? 'Adres çözümlenemedi' : e.code === 'ETIMEDOUT' ? 'Zaman aşımı' : (e.message || 'Bağlantı hatası')

export async function ping(host: string, port: number | null, timeoutMs = 5000): Promise<PingResult> {
  let h = host, p = port ?? 25565
  if (port == null && !net.isIP(host)) { try { const r = await dns.promises.resolveSrv('_minecraft._tcp.' + host); if (r[0]) { h = r[0].name; p = r[0].port } } catch { /* SRV kaydı yok */ } }
  return new Promise<PingResult>(resolve => {
    const t0 = Date.now(); let buf = Buffer.alloc(0), done = false
    const sock = net.connect({ host: h, port: p })
    const end = (r: PingResult) => { if (!done) { done = true; sock.destroy(); resolve(r) } }
    sock.setTimeout(timeoutMs, () => end({ online: false, error: 'Zaman aşımı' }))
    sock.on('error', e => end({ online: false, error: errText(e) }))
    sock.on('close', () => end({ online: false, error: 'Bağlantı kapandı' }))
    sock.on('connect', () => {
      const port16 = Buffer.alloc(2); port16.writeUInt16BE(p)
      sock.write(Buffer.concat([pkt(0, Buffer.concat([varint(-1), str(host), port16, varint(1)])), pkt(0)]))
    })
    sock.on('data', d => {
      buf = Buffer.concat([buf, typeof d === 'string' ? Buffer.from(d) : d])
      if (buf.length > 2_000_000) return end({ online: false, error: 'Yanıt çok büyük' })
      try {
        const r = parseStatus(buf); if (!r) return
        const j = r.json, fav = typeof j.favicon === 'string' && j.favicon.length < 150_000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(j.favicon) ? j.favicon : undefined
        end({ online: true, players: num(j.players?.online), max: num(j.players?.max), version: typeof j.version?.name === 'string' ? motdText(j.version.name).slice(0, 60) : undefined, motd: motdText(j.description).trim().slice(0, 200), favicon: fav, latency: Date.now() - t0 })
      } catch { end({ online: false, error: 'Geçersiz yanıt' }) }
    })
  })
}
