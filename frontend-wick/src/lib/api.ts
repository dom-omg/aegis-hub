const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aegis-backend.fly.dev'

export interface WickResult {
  verdict: 'SAFE' | 'VIOLATION_FOUND'
  cwe: string | null
  proof: string
  language: string
  project: string
  constraints_checked: number
  certificate_id: string
  signature: { signature_hex: string; public_key_hex: string; algorithm: string }
  timestamp: string
  certificate_b64: string
}

export async function analyzeCode(
  code: string,
  language: string,
  project: string,
): Promise<WickResult> {
  const res = await fetch(`${BACKEND}/api/wick/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language, project }),
  })
  if (!res.ok) throw new Error('Analysis failed')
  return res.json() as Promise<WickResult>
}

export async function runDemo(): Promise<WickResult> {
  const res = await fetch(`${BACKEND}/api/wick/demo`)
  if (!res.ok) throw new Error('Demo failed')
  return res.json() as Promise<WickResult>
}

export function downloadCert(b64: string, certId: string): void {
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  const blob = new Blob([arr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wick-cert-${certId.slice(0, 8)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
