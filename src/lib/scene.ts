const R = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647
export type Biome = 'grass' | 'nether' | 'end' | 'snow' | 'desert' | 'cave'
const PAL: Record<Biome, string[]> = {
  grass: ['#6ec6ff', '#d6f1ff', '#5da130', '#8a5a2b', '#707070', '#fff3a0'],
  nether: ['#2a0606', '#8a1c0c', '#b3412a', '#6b1f1f', '#3a1a1a', '#ff7a1a'],
  end: ['#0b0614', '#2b1850', '#d8d38a', '#c9c27a', '#8b7fb8', '#cfa8ff'],
  snow: ['#9fc3e8', '#f2f8ff', '#f4f8ff', '#8a6a4a', '#8c97a3', '#fff'],
  desert: ['#ff9a4a', '#ffe0a0', '#e8cf88', '#c9a35e', '#9a7a45', '#ffd24a'],
  cave: ['#0e0f12', '#23262c', '#4a4f58', '#3a3d44', '#5a5f69', '#ff6a1a'],
}
export function scene(seed: number, k: Biome): string {
  const p = PAL[k], r = R(seed * 977 + 13), id = `g${seed}${k}`
  let o = `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs><rect width="320" height="180" fill="url(#${id})"/>`
  if (k === 'end' || k === 'cave') for (let i = 0; i < 30; i++) o += `<rect x="${(r() * 320) | 0}" y="${(r() * 90) | 0}" width="2" height="2" fill="#fff" opacity=".6"/>`
  o += `<rect x="${(40 + r() * 200) | 0}" y="${(14 + r() * 20) | 0}" width="22" height="22" fill="${p[5]}"/>`
  let h = 8 + r() * 4
  for (let c = 0; c < 32; c++) {
    h = Math.max(6, Math.min(13, h + (r() - 0.5) * 2.4))
    const y = (180 - h * 10) | 0
    o += `<rect x="${c * 10}" y="${y}" width="10" height="${180 - y}" fill="${p[4]}"/><rect x="${c * 10}" y="${y}" width="10" height="30" fill="${p[3]}"/><rect x="${c * 10}" y="${y}" width="10" height="10" fill="${p[2]}"/>`
    if (r() < 0.12 && k !== 'cave') o += `<rect x="${c * 10 + 3}" y="${y - 30}" width="4" height="30" fill="#5b3a1a"/><rect x="${c * 10 - 7}" y="${y - 48}" width="24" height="20" fill="${k === 'nether' ? '#c0392b' : '#2f7d32'}"/>`
  }
  return o + '</svg>'
}
export function isoHero(): string {
  const r = R(7), w = 34, hh = 19
  const cs = [['#33363c', '#1f2125', '#17181b'], ['#ff8a30', '#c24e0e', '#8f3608'], ['#3d4148', '#26292d', '#1b1d20']]
  const cube = (x: number, y: number, z: number, [t, l, rr]: string[]) => {
    const X = 330 + (x - y) * w, Y = 60 + (x + y) * hh - z * 26
    return `<path d="M${X} ${Y}l${w} ${hh}l-${w} ${hh}l-${w} -${hh}z" fill="${t}"/><path d="M${X - w} ${Y + hh}l${w} ${hh}v26l-${w} -${hh}z" fill="${l}"/><path d="M${X + w} ${Y + hh}l-${w} ${hh}v26l${w} -${hh}z" fill="${rr}"/>`
  }
  let o = '<defs><radialGradient id="rg"><stop stop-color="#ff6a1a" stop-opacity=".5"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient></defs><circle cx="330" cy="170" r="190" fill="url(#rg)"/>'
  for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) {
    const n = 1 + ((r() * 3) | 0)
    for (let z = 0; z < n; z++) o += cube(x, y, z, cs[z === n - 1 && r() < 0.22 ? 1 : r() < 0.5 ? 0 : 2])
  }
  return o
}
