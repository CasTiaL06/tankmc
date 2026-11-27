// Skin dosyasından (64x64 veya eski 64x32) ön görünüm çizimi için kaynak/hedef dikdörtgenleri.
export interface Op { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; flip?: boolean }
export const headOps = (): Op[] => [{ sx: 8, sy: 8, sw: 8, sh: 8, dx: 0, dy: 0 }, { sx: 40, sy: 8, sw: 8, sh: 8, dx: 0, dy: 0 }]
// Tüm vücut: 16x32 birimlik tuval. Eski (64x32) skinlerde sol kol/bacak, sağın aynasıdır ve ikinci katman yoktur.
export function bodyOps(h: number, slim: boolean): Op[] {
  const aw = slim ? 3 : 4, old = h < 64, o: Op[] = []
  const part = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, flip = false) => { o.push({ sx, sy, sw, sh, dx, dy, flip }) }
  part(8, 8, 8, 8, 4, 0); part(20, 20, 8, 12, 4, 8)
  part(44, 20, aw, 12, 4 - aw, 8); part(old ? 44 : 36, old ? 20 : 52, aw, 12, 12, 8, old)
  part(4, 20, 4, 12, 4, 20); part(old ? 4 : 20, old ? 20 : 52, 4, 12, 8, 20, old)
  part(40, 8, 8, 8, 4, 0)
  if (!old) { part(20, 36, 8, 12, 4, 8); part(44, 36, aw, 12, 4 - aw, 8); part(52, 52, aw, 12, 12, 8); part(4, 36, 4, 12, 4, 20); part(4, 52, 4, 12, 8, 20) }
  return o
}
export function drawOps(canvas: HTMLCanvasElement, img: HTMLImageElement, ops: Op[], w: number, h: number, scale: number) {
  canvas.width = w * scale; canvas.height = h * scale
  const c = canvas.getContext('2d'); if (!c) return
  c.imageSmoothingEnabled = false; c.clearRect(0, 0, canvas.width, canvas.height)
  for (const o of ops) {
    c.save()
    if (o.flip) { c.translate((o.dx + o.sw) * scale, 0); c.scale(-1, 1); c.drawImage(img, o.sx, o.sy, o.sw, o.sh, 0, o.dy * scale, o.sw * scale, o.sh * scale) }
    else c.drawImage(img, o.sx, o.sy, o.sw, o.sh, o.dx * scale, o.dy * scale, o.sw * scale, o.sh * scale)
    c.restore()
  }
}
