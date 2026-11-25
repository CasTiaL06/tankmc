type AuthResult = { ok: true; user: { name: string; uuid: string } } | { ok: false; error: string }
interface Window { tank?: { platform: string; game: {
  versions(): Promise<{ ok: true; versions: string[] } | { ok: false; error: string }>
  play(id: string): Promise<{ ok: boolean; error?: string }>
  onProgress(cb: (p: { text: string; pct: number }) => void): () => void
  onState(cb: (s: { state: string; message?: string }) => void): () => void }; auth: {
  restore(): Promise<AuthResult>; login(): Promise<AuthResult>; cancel(): Promise<void>; logout(): Promise<void>
  onCode(cb: (c: { userCode: string; url: string }) => void): () => void } } }
