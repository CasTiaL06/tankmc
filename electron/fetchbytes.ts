// Gövdeyi parça parça okur: ilerleme bildirir, üst sınırı aşarsa durur.
export async function readBody(r: Response, onBytes?: (n: number) => void, max = Infinity): Promise<Buffer> {
  if (!r.body) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > max) throw new Error('Dosya çok büyük'); onBytes?.(b.length); return b }
  const chunks: Buffer[] = [], reader = r.body.getReader(); let n = 0
  for (;;) {
    const { done, value } = await reader.read(); if (done) break
    n += value.length; if (n > max) { await reader.cancel(); throw new Error('Dosya çok büyük') }
    chunks.push(Buffer.from(value)); onBytes?.(value.length)
  }
  return Buffer.concat(chunks)
}
