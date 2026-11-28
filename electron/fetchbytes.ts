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

export interface FetchOpts {
  headers?: Record<string, string>; signal?: AbortSignal; onBytes?: (n: number) => void; max?: number
  retries?: number; delayMs?: number; timeoutMs?: number; verify?: (b: Buffer) => void; label?: string
}
// Geçici ağ hatalarına (bağlantı kopması, zaman aşımı, 429/5xx, bozuk içerik) karşı en fazla 3 deneme; 404 gibi kalıcı hatalar ve iptal denenmez.
// Yeniden denemede o ana kadar bildirilen bayt geri alınır (onBytes negatif), böylece ilerleme çift sayılmaz.
export async function fetchBuffer(url: string, o: FetchOpts = {}): Promise<Buffer> {
  const tries = o.retries ?? 3; let last: Error = new Error('bilinmeyen hata')
  for (let i = 1; i <= tries; i++) {
    let got = 0
    try {
      const sigs = [o.timeoutMs ? AbortSignal.timeout(o.timeoutMs) : undefined, o.signal].filter((s): s is AbortSignal => !!s)
      const r = await fetch(url, { headers: o.headers, signal: sigs.length ? AbortSignal.any(sigs) : undefined })
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { retry: r.status === 429 || r.status >= 500 })
      if (Number(r.headers.get('content-length') ?? 0) > (o.max ?? Infinity)) throw Object.assign(new Error('Dosya çok büyük'), { retry: false })
      const b = await readBody(r, n => { got += n; o.onBytes?.(n) }, o.max)
      o.verify?.(b); return b
    } catch (e) {
      last = e as Error
      if (o.signal?.aborted) throw last
      if (got) o.onBytes?.(-got)
      const retry = (e as { retry?: boolean }).retry ?? !/çok büyük/.test(last.message)
      if (!retry || i === tries) break
      await new Promise(r => setTimeout(r, (o.delayMs ?? 700) * i))
    }
  }
  throw new Error(`${o.label ?? 'Dosya'} indirilemedi: ${last.message}`)
}
