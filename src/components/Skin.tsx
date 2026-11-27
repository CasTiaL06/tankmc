import { ReactNode, useEffect, useRef, useState } from 'react'
import { bodyOps, drawOps, headOps } from '../lib/skin'

// Skin, Mojang'ın doku sunucusundan alınan gerçek PNG'den çizilir; skin yoksa yedek içerik gösterilir.
export default function Skin({ skin, mode, scale, fallback, className }: { skin: SkinData | null; mode: 'head' | 'body'; scale: number; fallback?: ReactNode; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null), [ok, setOk] = useState(false)
  useEffect(() => {
    setOk(false); if (!skin) return
    const img = new Image()
    img.onload = () => {
      const c = ref.current; if (!c || img.width !== 64 || (img.height !== 64 && img.height !== 32)) return
      if (mode === 'head') drawOps(c, img, headOps(), 8, 8, scale); else drawOps(c, img, bodyOps(img.height, skin.slim), 16, 32, scale)
      setOk(true)
    }
    img.src = skin.dataUrl
  }, [skin?.dataUrl, skin?.slim, mode, scale])
  return <>{!ok && fallback}<canvas ref={ref} className={className} style={{ display: ok ? 'block' : 'none', imageRendering: 'pixelated' }} /></>
}
