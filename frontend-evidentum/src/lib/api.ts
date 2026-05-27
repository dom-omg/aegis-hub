const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aegis-backend.fly.dev'

export interface AnalysisResult {
  verdict: 'FLAGGED' | 'CLEAN'
  proof_type: string
  wallet: string
  chain: string
  case_ref: string
  transactions_analyzed: number
  constraints_checked: number
  proof_hash: string
  signature: {
    signature_hex: string
    public_key_hex: string
    algorithm: string
  }
  timestamp_info: {
    timestamp: string
    tsa: string
    rfc3161: boolean
  }
  affidavit_b64: string
  processing_ms: number
}

export async function analyzeWallet(
  wallet: string,
  chain: string,
  caseRef: string
): Promise<AnalysisResult> {
  const res = await fetch(`${BACKEND}/api/evidentum/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, chain, case_ref: caseRef }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Analysis failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<AnalysisResult>
}

export async function runDemo(): Promise<AnalysisResult> {
  const res = await fetch(`${BACKEND}/api/evidentum/demo`)
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Demo failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<AnalysisResult>
}

export function downloadPDF(b64: string, wallet: string): void {
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  const blob = new Blob([arr], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `evidentum-proof-${wallet.slice(0, 8)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
