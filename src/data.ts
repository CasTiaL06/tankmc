import type { Biome } from './lib/scene'
export interface Pack { id: number; n: string; l: string; v: string; m: number; c: string; d: string; s: number; k: Biome; f: boolean }
export interface Server { id: number; n: string; ip: string; d: string; p: number; mx: number; v: string; k: Biome; on: boolean }
// Örnek veri. Aşama 6-7'de JSON/GitHub ve Modrinth kaynaklarına bağlanacak.
export const PACKS: Pack[] = [
  { id: 1, n: 'Performans+', l: 'Fabric', v: '1.21.4', m: 42, c: 'Performans', d: 'Yüksek FPS ve akıcı oyun için optimize edilmiş hafif mod seti.', s: 1, k: 'grass', f: true },
  { id: 2, n: 'Teknoloji Çağı', l: 'Forge', v: '1.20.1', m: 87, c: 'Teknoloji', d: 'Makineler, enerji üretimi ve tam otomasyon.', s: 2, k: 'cave', f: true },
  { id: 3, n: 'Nether Macera', l: 'NeoForge', v: '1.21.1', m: 65, c: 'Macera', d: 'Yeni boyutlar, canavarlar ve zindanlar.', s: 3, k: 'nether', f: false },
  { id: 4, n: 'Büyücü Kuleleri', l: 'Forge', v: '1.19.2', m: 54, c: 'Macera', d: 'Büyü sistemi, kuleler ve efsanevi eşyalar.', s: 4, k: 'end', f: false },
  { id: 5, n: 'Kış Hayatta Kalma', l: 'Fabric', v: '1.20.4', m: 38, c: 'Hayatta Kalma', d: 'Soğuk, sıcaklık ve kaynak yönetimi.', s: 5, k: 'snow', f: false },
  { id: 6, n: 'Çöl İmparatorluğu', l: 'Fabric', v: '1.21.4', m: 29, c: 'Hayatta Kalma', d: 'Kum fırtınaları, vahalar ve antik harabeler.', s: 6, k: 'desert', f: false },
]
export const SERVERS: Server[] = [
  { id: 11, n: 'TANK Survival', ip: 'play.tankmc.example', d: 'Hayatta kalma ve ekonomi sunucusu.', p: 128, mx: 300, v: '1.21.4', k: 'grass', on: true },
  { id: 12, n: 'TANK SkyBlock', ip: 'sky.tankmc.example', d: 'Adada başla, imparatorluk kur.', p: 64, mx: 200, v: '1.20.1', k: 'end', on: true },
  { id: 13, n: 'TANK PvP', ip: 'pvp.tankmc.example', d: 'Rekabetçi arenalar ve sıralama.', p: 212, mx: 400, v: '1.8.9', k: 'nether', on: true },
  { id: 14, n: 'TANK Creative', ip: 'build.tankmc.example', d: 'Sınırsız yaratıcılık, dev plotlar.', p: 0, mx: 100, v: '1.21.4', k: 'desert', on: false },
]
