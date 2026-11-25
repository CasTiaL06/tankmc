import zlib from 'zlib'

export interface ZipEntry { name: string; dir: boolean; read(): Buffer }
const MAX = 200_000_000
// Küçük, bağımlılıksız zip okuyucu (.mrpack için). Zip64 ve şifreli zip desteklenmez.
export function readZip(buf: Buffer): ZipEntry[] {
  let e = buf.length - 22
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--
  if (e < 0) throw new Error('Geçerli bir zip dosyası değil')
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16)
  if (n > 5000) throw new Error('Zip çok fazla dosya içeriyor')
  const out: ZipEntry[] = []
  for (let i = 0; i < n; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Zip bozuk')
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24)
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nl)
    p += 46 + nl + xl + cl
    out.push({ name, dir: name.endsWith('/'), read() {
      if (csize === 0xffffffff || usize === 0xffffffff || usize > MAX) throw new Error('Zip içindeki dosya desteklenmiyor veya çok büyük')
      const s = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), raw = buf.subarray(s, s + csize)
      if (method !== 0 && method !== 8) throw new Error('Desteklenmeyen zip sıkıştırma yöntemi')
      const d = method === 0 ? raw : zlib.inflateRawSync(raw, { maxOutputLength: MAX })
      if (d.length !== usize) throw new Error('Zip boyutu uyuşmuyor')
      return d
    } })
  }
  return out
}
