type AuthResult = { ok: true; user: { name: string; uuid: string } } | { ok: false; error: string }
interface Window { tank?: { platform: string; auth: {
  restore(): Promise<AuthResult>; login(): Promise<AuthResult>; cancel(): Promise<void>; logout(): Promise<void>
  onCode(cb: (c: { userCode: string; url: string }) => void): () => void } } }
