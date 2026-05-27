'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { analyzeWallet, runDemo, downloadPDF, type AnalysisResult } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type Chain = 'ETH' | 'BTC' | 'TRX' | 'SOL'
type Phase = 'idle' | 'terminal' | 'done' | 'error'

interface TerminalStep {
  label: string
  done: boolean
  active: boolean
}

const TERMINAL_STEPS: string[] = [
  'Fetching transactions...',
  'Encoding Z3 constraints...',
  'Running formal solver...',
  'Signing proof (ML-DSA-65)...',
  'Requesting RFC 3161 timestamp...',
  'Generating affidavit PDF...',
]

const DEMO_WALLET = '4eznx6PCBBwMRZdpDC7vBFSf7Y6a8VFgRMoZH3icEcYH'
const DEMO_CHAIN: Chain = 'ETH'

// ─── Sub-components ──────────────────────────────────────────────────────────

function ClassifiedBadge() {
  return (
    <div className="flex items-center gap-2 text-xs tracking-widest uppercase">
      <span
        className="inline-block w-2 h-2 rounded-full pulse-green"
        style={{ background: '#00ff88' }}
      />
      <span style={{ color: '#00ff88', opacity: 0.7 }}>CLASSIFIED — LAW ENFORCEMENT USE ONLY</span>
    </div>
  )
}

function Header() {
  return (
    <header
      className="relative z-10 border-b px-6 py-4 flex items-center justify-between"
      style={{ borderColor: 'rgba(0,255,136,0.15)', background: 'rgba(0,0,0,0.6)' }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#00ff88', fontFamily: 'JetBrains Mono, monospace' }}
          >
            [EVIDENTUM]
          </div>
          <div
            className="hidden sm:block text-xs uppercase tracking-widest pl-4 border-l"
            style={{ color: 'rgba(0,255,136,0.5)', borderColor: 'rgba(0,255,136,0.2)' }}
          >
            Proof Intelligence Platform
          </div>
        </div>
      </div>
      <ClassifiedBadge />
    </header>
  )
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex flex-col items-center px-6 py-4 rounded border"
      style={{ borderColor: 'rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.03)' }}
    >
      <span
        className="text-3xl font-bold tabular-nums"
        style={{ color: '#00ff88', fontFamily: 'JetBrains Mono, monospace' }}
      >
        {value}
      </span>
      <span className="text-xs mt-1 uppercase tracking-widest" style={{ color: 'rgba(224,224,224,0.5)' }}>
        {label}
      </span>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative z-10 px-6 pt-16 pb-12 text-center max-w-4xl mx-auto">
      <div
        className="text-xs uppercase tracking-widest mb-6 inline-block px-3 py-1 rounded"
        style={{ color: '#00ff88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}
      >
        Wick Security Inc. — Intelligence Division
      </div>
      <h1
        className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
        style={{ color: '#f0f0f0', letterSpacing: '-0.02em' }}
      >
        Blockchain evidence that
        <br />
        <span style={{ color: '#00ff88' }} className="text-glow-green">
          holds up in court.
        </span>
      </h1>
      <p
        className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10"
        style={{ color: 'rgba(224,224,224,0.65)' }}
      >
        EVIDENTUM transforms wallet forensics into formally-verified Z3 proofs,
        timestamped under RFC 3161 and signed with post-quantum cryptography.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <StatPill value="&lt; 30s" label="Proof generation" />
        <StatPill value="Z3 SAT" label="Formal solver" />
        <StatPill value="ML-DSA-65" label="PQC signature" />
        <StatPill value="Court-ready" label="PDF affidavit" />
      </div>
    </section>
  )
}

function ChainSelect({ value, onChange, disabled }: {
  value: Chain
  onChange: (v: Chain) => void
  disabled: boolean
}) {
  const chains: { value: Chain; label: string }[] = [
    { value: 'ETH', label: 'ETH — Ethereum' },
    { value: 'BTC', label: 'BTC — Bitcoin' },
    { value: 'TRX', label: 'TRX — Tron' },
    { value: 'SOL', label: 'SOL — Solana' },
  ]
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Chain)}
      disabled={disabled}
      className="terminal-input w-full rounded px-4 py-3 text-sm border transition-colors"
      style={{
        background: '#0d0d0d',
        borderColor: 'rgba(0,255,136,0.25)',
        color: '#e0e0e0',
        fontFamily: 'JetBrains Mono, monospace',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2300ff88' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '36px',
      }}
    >
      {chains.map((c) => (
        <option key={c.value} value={c.value} style={{ background: '#0d0d0d' }}>
          {c.label}
        </option>
      ))}
    </select>
  )
}

function TerminalWindow({ steps, isRunning }: { steps: TerminalStep[]; isRunning: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps])

  return (
    <div
      className="rounded-lg border mt-6 overflow-hidden"
      style={{ borderColor: 'rgba(0,255,136,0.2)', background: '#050505' }}
    >
      {/* Terminal header bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: 'rgba(0,255,136,0.1)', background: '#0a0a0a' }}
      >
        <div className="w-3 h-3 rounded-full" style={{ background: '#ff3366', opacity: 0.8 }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#ffcc00', opacity: 0.8 }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#00ff88', opacity: 0.8 }} />
        <span
          className="ml-3 text-xs"
          style={{ color: 'rgba(0,255,136,0.4)', fontFamily: 'JetBrains Mono, monospace' }}
        >
          evidentum-engine v2.1.0 — CLASSIFIED
        </span>
        {isRunning && (
          <span
            className="ml-auto text-xs pulse-green"
            style={{ color: '#00ff88' }}
          >
            PROCESSING
          </span>
        )}
      </div>

      {/* Terminal body */}
      <div className="p-4 space-y-1 min-h-[180px]">
        <div className="text-xs mb-3" style={{ color: 'rgba(0,255,136,0.4)' }}>
          $ evidentum-engine --mode forensic --sign ml-dsa-65 --timestamp rfc3161
        </div>
        {steps.filter((s) => s.done || s.active).map((step, i) => (
          <div
            key={i}
            className="terminal-line flex items-center gap-3 text-sm"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {step.done ? (
              <span style={{ color: '#00ff88' }}>[&#10003;]</span>
            ) : (
              <span style={{ color: '#ffcc00' }} className="pulse-green">[~]</span>
            )}
            <span style={{ color: step.done ? '#e0e0e0' : 'rgba(224,224,224,0.6)' }}>
              {step.label}
            </span>
            {step.active && !step.done && (
              <span className="cursor-blink" style={{ color: '#00ff88' }}>_</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function TruncatedHash({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [value])

  const display = value.length > 24 ? `${value.slice(0, 12)}...${value.slice(-8)}` : value

  return (
    <div>
      <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(224,224,224,0.4)' }}>
        {label}
      </div>
      <button
        onClick={copy}
        className="text-xs font-mono flex items-center gap-2 group"
        style={{ color: 'rgba(0,255,136,0.8)' }}
        title="Click to copy full value"
      >
        <span>{display}</span>
        <span
          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'rgba(0,255,136,0.5)' }}
        >
          {copied ? '✓ copied' : '[copy]'}
        </span>
      </button>
    </div>
  )
}

function VerdictCard({ result, onDownload }: { result: AnalysisResult; onDownload: () => void }) {
  const isFlagged = result.verdict === 'FLAGGED'

  return (
    <div
      className={`rounded-lg border-2 mt-6 overflow-hidden ${isFlagged ? 'glow-red' : 'glow-green'}`}
      style={{
        borderColor: isFlagged ? '#ff3366' : '#00ff88',
        background: isFlagged ? 'rgba(255,51,102,0.04)' : 'rgba(0,255,136,0.04)',
      }}
    >
      {/* Verdict header */}
      <div
        className="px-6 py-5 border-b flex items-center justify-between flex-wrap gap-3"
        style={{
          borderColor: isFlagged ? 'rgba(255,51,102,0.2)' : 'rgba(0,255,136,0.2)',
          background: isFlagged ? 'rgba(255,51,102,0.06)' : 'rgba(0,255,136,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isFlagged ? '⚠' : '✓'}</span>
          <div>
            <div
              className="text-lg font-bold tracking-wide"
              style={{
                color: isFlagged ? '#ff3366' : '#00ff88',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {isFlagged ? 'FORMAL VIOLATION PROVEN' : 'NO VIOLATION FOUND'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(224,224,224,0.5)' }}>
              {isFlagged ? result.proof_type : 'Z3 solver found no constraint violations'}
            </div>
          </div>
        </div>
        <div
          className="text-xs px-3 py-1 rounded font-bold tracking-widest"
          style={{
            background: isFlagged ? '#ff3366' : '#00ff88',
            color: '#0a0a0a',
          }}
        >
          {result.verdict}
        </div>
      </div>

      {/* Metadata grid */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(224,224,224,0.4)' }}>
            Wallet Address
          </div>
          <div className="text-xs font-mono" style={{ color: '#e0e0e0', wordBreak: 'break-all' }}>
            {result.wallet}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(224,224,224,0.4)' }}>
            Chain
          </div>
          <div className="text-sm font-bold" style={{ color: '#00ff88' }}>
            {result.chain}
          </div>
        </div>

        {result.case_ref && (
          <div>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(224,224,224,0.4)' }}>
              Case Reference
            </div>
            <div className="text-sm font-mono" style={{ color: '#e0e0e0' }}>
              {result.case_ref}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(224,224,224,0.4)' }}>
            Transactions Analyzed
          </div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: '#e0e0e0' }}>
            {result.transactions_analyzed.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(224,224,224,0.4)' }}>
            Constraints Checked
          </div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: '#e0e0e0' }}>
            {result.constraints_checked.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(224,224,224,0.4)' }}>
            Processing Time
          </div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: '#e0e0e0' }}>
            {result.processing_ms}
            <span className="text-sm font-normal ml-1" style={{ color: 'rgba(224,224,224,0.5)' }}>ms</span>
          </div>
        </div>
      </div>

      {/* Cryptographic proofs */}
      <div
        className="px-6 pb-6 pt-0 border-t grid grid-cols-1 sm:grid-cols-2 gap-4"
        style={{ borderColor: 'rgba(0,255,136,0.1)', paddingTop: '1.25rem', marginTop: '0' }}
      >
        <TruncatedHash value={result.proof_hash} label="Proof Hash (SHA-256)" />
        <TruncatedHash value={result.signature.signature_hex} label={`Signature (${result.signature.algorithm})`} />
        <TruncatedHash value={result.signature.public_key_hex} label="Public Key" />
        <div>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(224,224,224,0.4)' }}>
            RFC 3161 Timestamp
          </div>
          <div className="text-xs font-mono" style={{ color: 'rgba(0,255,136,0.8)' }}>
            {result.timestamp_info.timestamp}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(224,224,224,0.35)' }}>
            TSA: {result.timestamp_info.tsa}
            {result.timestamp_info.rfc3161 && (
              <span className="ml-2" style={{ color: '#00ff88' }}>[RFC 3161 ✓]</span>
            )}
          </div>
        </div>
      </div>

      {/* Download button */}
      <div className="px-6 pb-6">
        <button
          onClick={onDownload}
          className="w-full py-4 rounded text-base font-bold tracking-wide transition-all"
          style={{
            background: isFlagged ? '#ff3366' : '#00ff88',
            color: '#0a0a0a',
            fontFamily: 'JetBrains Mono, monospace',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = isFlagged
              ? '0 0 25px rgba(255,51,102,0.4)'
              : '0 0 25px rgba(0,255,136,0.4)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
          }}
        >
          &#8595; DOWNLOAD AFFIDAVIT (PDF)
        </button>
        <p className="text-center text-xs mt-2" style={{ color: 'rgba(224,224,224,0.3)' }}>
          Digitally signed · RFC 3161 timestamped · Court-admissible
        </p>
      </div>
    </div>
  )
}

function AnalysisForm() {
  const [wallet, setWallet] = useState('')
  const [chain, setChain] = useState<Chain>('ETH')
  const [caseRef, setCaseRef] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [terminalSteps, setTerminalSteps] = useState<TerminalStep[]>([])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = useCallback(async (fetchFn: () => Promise<AnalysisResult>) => {
    setPhase('terminal')
    setResult(null)
    setError(null)

    // Initialize steps
    const initial: TerminalStep[] = TERMINAL_STEPS.map((label) => ({
      label,
      done: false,
      active: false,
    }))
    initial[0] = { ...initial[0], active: true }
    setTerminalSteps(initial)

    // Kick off the real API call in parallel
    const apiPromise = fetchFn()

    // Animate the terminal steps sequentially
    const STEP_DURATION = 600 // ms per step
    for (let i = 0; i < TERMINAL_STEPS.length; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, i === 0 ? 0 : STEP_DURATION))
      setTerminalSteps((prev) =>
        prev.map((s, idx) => ({
          ...s,
          done: idx < i,
          active: idx === i,
        }))
      )
    }

    // Wait for real result
    let apiResult: AnalysisResult
    try {
      apiResult = await apiPromise
    } catch (err) {
      setPhase('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
      return
    }

    // Mark all done
    setTerminalSteps((prev) => prev.map((s) => ({ ...s, done: true, active: false })))
    await new Promise<void>((resolve) => setTimeout(resolve, 300))

    setResult(apiResult)
    setPhase('done')
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!wallet.trim()) return
      void runAnalysis(() => analyzeWallet(wallet.trim(), chain, caseRef.trim()))
    },
    [wallet, chain, caseRef, runAnalysis]
  )

  const handleDemo = useCallback(() => {
    setWallet(DEMO_WALLET)
    setChain(DEMO_CHAIN)
    setCaseRef('RCMP-2026-DEMO')
    void runAnalysis(() => runDemo())
  }, [runAnalysis])

  const handleDownload = useCallback(() => {
    if (result?.affidavit_b64) {
      downloadPDF(result.affidavit_b64, result.wallet)
    }
  }, [result])

  const handleReset = useCallback(() => {
    setPhase('idle')
    setResult(null)
    setError(null)
    setTerminalSteps([])
  }, [])

  const isRunning = phase === 'terminal'
  const inputDisabled = isRunning

  return (
    <section className="relative z-10 max-w-2xl mx-auto px-6 pb-16">
      {/* Form panel */}
      <div
        className="rounded-lg border p-6 glow-green"
        style={{ borderColor: 'rgba(0,255,136,0.2)', background: 'rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: '#00ff88', fontFamily: 'JetBrains Mono, monospace' }}
            >
              FORENSIC ANALYSIS ENGINE
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(224,224,224,0.4)' }}>
              Formal proof generation — Z3 solver + ML-DSA-65
            </p>
          </div>
          {(phase === 'done' || phase === 'error') && (
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded border transition-colors"
              style={{
                borderColor: 'rgba(0,255,136,0.3)',
                color: 'rgba(0,255,136,0.7)',
              }}
            >
              ↺ New Analysis
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Wallet input */}
          <div>
            <label
              className="block text-xs uppercase tracking-widest mb-1.5"
              style={{ color: 'rgba(224,224,224,0.5)' }}
            >
              Target Wallet Address <span style={{ color: '#ff3366' }}>*</span>
            </label>
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              disabled={inputDisabled}
              placeholder="0x... or 1... or T... or base58..."
              className="terminal-input w-full rounded px-4 py-3 text-sm border transition-colors"
              style={{
                background: '#0d0d0d',
                borderColor: 'rgba(0,255,136,0.25)',
                color: '#e0e0e0',
                fontFamily: 'JetBrains Mono, monospace',
                opacity: inputDisabled ? 0.5 : 1,
              }}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Chain + Case ref row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-1.5"
                style={{ color: 'rgba(224,224,224,0.5)' }}
              >
                Blockchain
              </label>
              <ChainSelect value={chain} onChange={setChain} disabled={inputDisabled} />
            </div>
            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-1.5"
                style={{ color: 'rgba(224,224,224,0.5)' }}
              >
                Case Reference <span style={{ color: 'rgba(224,224,224,0.3)' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={caseRef}
                onChange={(e) => setCaseRef(e.target.value)}
                disabled={inputDisabled}
                placeholder="RCMP-2026-001"
                className="terminal-input w-full rounded px-4 py-3 text-sm border transition-colors"
                style={{
                  background: '#0d0d0d',
                  borderColor: 'rgba(0,255,136,0.25)',
                  color: '#e0e0e0',
                  fontFamily: 'JetBrains Mono, monospace',
                  opacity: inputDisabled ? 0.5 : 1,
                }}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Primary CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!wallet.trim() || isRunning}
              className="btn-primary w-full py-4 rounded text-base font-bold tracking-widest uppercase"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {isRunning ? '[ GENERATING PROOF... ]' : '[ GENERATE PROOF ]'}
            </button>
          </div>
        </form>

        {/* Demo link */}
        {phase === 'idle' && (
          <div className="mt-4 text-center">
            <button
              onClick={handleDemo}
              className="text-sm underline underline-offset-2 transition-colors"
              style={{ color: 'rgba(0,255,136,0.5)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#00ff88')}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,255,136,0.5)')
              }
            >
              Try Demo &rarr;
            </button>
            <span className="text-xs ml-2" style={{ color: 'rgba(224,224,224,0.3)' }}>
              Ruja Ignatova OneCoin wallet
            </span>
          </div>
        )}
      </div>

      {/* Terminal animation */}
      {(phase === 'terminal' || phase === 'done') && terminalSteps.length > 0 && (
        <TerminalWindow steps={terminalSteps} isRunning={isRunning} />
      )}

      {/* Error state */}
      {phase === 'error' && error && (
        <div
          className="mt-6 rounded border p-4"
          style={{ borderColor: 'rgba(255,51,102,0.4)', background: 'rgba(255,51,102,0.05)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: '#ff3366' }}>&#9888;</span>
            <span className="text-sm font-bold" style={{ color: '#ff3366' }}>
              ANALYSIS FAILED
            </span>
          </div>
          <pre
            className="text-xs whitespace-pre-wrap break-words"
            style={{ color: 'rgba(224,224,224,0.6)', fontFamily: 'JetBrains Mono, monospace' }}
          >
            {error}
          </pre>
          <p className="text-xs mt-3" style={{ color: 'rgba(224,224,224,0.4)' }}>
            Backend: {process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aegis-backend.fly.dev'}
          </p>
        </div>
      )}

      {/* Results */}
      {phase === 'done' && result && (
        <VerdictCard result={result} onDownload={handleDownload} />
      )}
    </section>
  )
}

function InfoStrip() {
  const items = [
    { icon: '⚖', label: 'Admissible Evidence', desc: 'Meets Federal Rules of Evidence standards' },
    { icon: '🔒', label: 'Post-Quantum Signed', desc: 'ML-DSA-65 — NIST FIPS 204' },
    { icon: '⏱', label: 'RFC 3161 Timestamp', desc: 'Legally binding trusted timestamp' },
    { icon: '∀', label: 'Formal Verification', desc: 'Z3 SMT solver — mathematical certainty' },
  ]
  return (
    <section
      className="relative z-10 border-y py-8"
      style={{ borderColor: 'rgba(0,255,136,0.08)', background: 'rgba(0,255,136,0.02)' }}
    >
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-sm font-bold mb-1" style={{ color: '#00ff88' }}>
              {item.label}
            </div>
            <div className="text-xs" style={{ color: 'rgba(224,224,224,0.4)' }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer
      className="relative z-10 border-t px-6 py-8 mt-auto"
      style={{ borderColor: 'rgba(0,255,136,0.1)' }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div
            className="text-sm font-bold"
            style={{ color: 'rgba(0,255,136,0.7)', fontFamily: 'JetBrains Mono, monospace' }}
          >
            EVIDENTUM &copy; 2026 &mdash; Wick Security Inc.
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(224,224,224,0.3)' }}>
            Proof Intelligence &nbsp;|&nbsp; Formally Verified &nbsp;|&nbsp; Court-Ready
          </div>
        </div>
        <div className="text-xs text-right" style={{ color: 'rgba(224,224,224,0.25)' }}>
          <div>RESTRICTED — FOR AUTHORIZED LAW ENFORCEMENT USE</div>
          <div className="mt-0.5">All proofs cryptographically signed and auditable</div>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0a0a0a' }}
      >
        <div
          className="text-sm pulse-green"
          style={{ color: '#00ff88', fontFamily: 'JetBrains Mono, monospace' }}
        >
          [EVIDENTUM] INITIALIZING...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col grid-bg relative">
      {/* Scanlines overlay */}
      <div className="fixed inset-0 scanlines pointer-events-none z-0" aria-hidden="true" />

      <Header />
      <HeroSection />
      <InfoStrip />

      <main className="flex-1 py-12">
        <AnalysisForm />
      </main>

      <Footer />
    </div>
  )
}
