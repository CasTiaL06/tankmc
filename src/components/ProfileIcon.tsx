import { scene, Biome } from '../lib/scene'

const BIOMES: Biome[] = ['grass', 'nether', 'end', 'snow', 'desert', 'cave']
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
// Mod paketinden gelen gerçek ikon varsa o; yoksa profil adına göre üretilen blok manzarası
export default function ProfileIcon({ p }: { p: Inst }) {
  return p.icon ? <img className="pi" alt="" src={p.icon} loading="lazy" />
    : <div className="pi" dangerouslySetInnerHTML={{ __html: scene(hash(p.name) % 997, BIOMES[hash(p.name + p.loader) % 6]) }} />
}
