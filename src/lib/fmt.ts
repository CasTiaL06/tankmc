export const fmtBytes = (n: number) => n < 1024 ? `${Math.round(n)} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`
export const fmtSpeed = (n: number) => (n > 0 ? `${fmtBytes(n)}/sn` : '—')
export const fmtEta = (s: number | null) => s == null ? '—' : s < 60 ? `${Math.ceil(s)} sn` : s < 3600 ? `${Math.floor(s / 60)} dk ${Math.ceil(s % 60)} sn` : `${Math.floor(s / 3600)} sa ${Math.floor((s % 3600) / 60)} dk`
export const fmtDur = (ms: number) => fmtEta(Math.max(0, Math.round(ms / 1000)))
