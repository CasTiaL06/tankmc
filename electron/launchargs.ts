import path from 'path'

export interface Rule { action: 'allow' | 'disallow'; os?: { name?: string; arch?: string }; features?: Record<string, boolean> }
type Arg = string | { rules?: Rule[]; value: string | string[] }
export interface VersionJson { id: string; type: string; mainClass: string; arguments?: { game: Arg[]; jvm: Arg[] }; minecraftArguments?: string }

// Mojang kural değerlendirmesi (yalnızca Windows). 'features' koşullu argümanlar (demo, özel çözünürlük...) uygulanmaz.
export function ruleOk(rules?: Rule[], arch: string = process.arch): boolean {
  if (!rules?.length) return true
  let ok = false
  for (const r of rules) {
    const osOk = !r.os || ((!r.os.name || r.os.name === 'windows') && (!r.os.arch || r.os.arch === (arch === 'ia32' ? 'x86' : arch)))
    if (osOk && !r.features) ok = r.action === 'allow'
  }
  return ok
}
const expand = (s: string, v: Record<string, string>) => s.replace(/\$\{(\w+)\}/g, (_, k) => v[k] ?? '')
const flat = (a: Arg[], v: Record<string, string>): string[] =>
  a.flatMap(x => typeof x === 'string' ? [expand(x, v)] : ruleOk(x.rules) ? [x.value].flat().map(s => expand(s, v)) : [])

export function buildArgs(j: VersionJson, v: Record<string, string>): string[] {
  const jvm = j.arguments ? flat(j.arguments.jvm, v) : ['-Djava.library.path=' + v.natives_directory, '-cp', v.classpath]
  const game = j.arguments ? flat(j.arguments.game, v) : expand(j.minecraftArguments ?? '', v).split(/\s+/).filter(Boolean)
  return [...jvm, j.mainClass, ...game]
}
// Mojang JSON'undan gelen yolların kök klasörün dışına çıkmasını engeller.
export function safeJoin(root: string, rel: string): string {
  const r = path.resolve(root), p = path.resolve(r, rel)
  if (p !== r && !p.startsWith(r + path.sep)) throw new Error('Güvensiz dosya yolu: ' + rel)
  return p
}
