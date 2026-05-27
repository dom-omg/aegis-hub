'use client'

import { useState, useCallback, useRef } from 'react'
import { analyzeCode, runDemo, downloadCert, type WickResult } from '@/lib/api'

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEMO_CODE = `// Classic CWE-190: Integer Overflow
// Wick Security will detect the multiplication overflow
// and generate a formal Z3 proof of the violation.

int process_buffer(int size) {
    int total = size * 4;  // potential overflow
    char* buf = malloc(total);
    return total;
}`

const LANGUAGES = ['C', 'Python', 'TypeScript', 'Rust', 'Go'] as const
type Language = (typeof LANGUAGES)[number]

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-3">
      <span className="text-sm font-semibold text-[#0ea5e9] tracking-wide">{value}</span>
      <span className="text-xs text-[#7d8590] tracking-wider uppercase">{label}</span>
    </div>
  )
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="loading-dot w-1.5 h-1.5 rounded-full bg-white/60"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="feature-card bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex flex-col gap-4">
      <div className="w-10 h-10 rounded-lg bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 flex items-center justify-center text-[#0ea5e9]">
        {icon}
      </div>
      <div>
        <h3 className="text-[#e6edf3] font-semibold text-base mb-1.5">{title}</h3>
        <p className="text-[#7d8590] text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function ResultsPanel({ result }: { result: WickResult }) {
  const [copied, setCopied] = useState(false)
  const isSafe = result.verdict === 'SAFE'

  const handleCopy = useCallback(async () => {
    const shareText = `Wick Security Proof Certificate\nID: ${result.certificate_id}\nVerdict: ${result.verdict}\nTimestamp: ${result.timestamp}\nProject: ${result.project}`
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available in all environments
    }
  }, [result])

  const formattedTs = new Date(result.timestamp).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })

  return (
    <div className={`results-animate rounded-xl border p-6 flex flex-col gap-5 ${isSafe ? 'cert-safe bg-[#0d2119] border-[#238636]' : 'cert-violation bg-[#1a0f05] border-[#f97316]'}`}>

      {/* Header — Verdict */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {isSafe ? (
            <ShieldCheckIcon className="w-9 h-9 text-[#3fb950] flex-shrink-0" />
          ) : (
            <AlertTriangleIcon className="w-9 h-9 text-[#f97316] flex-shrink-0" />
          )}
          <div>
            <div className={`text-xl font-bold tracking-tight ${isSafe ? 'text-[#3fb950]' : 'text-[#f97316]'}`}>
              {isSafe ? 'VERIFIED SAFE' : 'VIOLATION FOUND'}
            </div>
            <div className="text-[#7d8590] text-xs mt-0.5 font-mono">
              {result.certificate_id}
            </div>
          </div>
        </div>
        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${isSafe ? 'text-[#3fb950] border-[#238636] bg-[#238636]/15' : 'text-[#f97316] border-[#f97316]/40 bg-[#f97316]/10'}`}>
          {isSafe ? 'PROOF COMPLETE' : 'CWE DETECTED'}
        </span>
      </div>

      {/* CWE block (violations only) */}
      {!isSafe && result.cwe && (
        <div className="bg-[#f97316]/8 border border-[#f97316]/25 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-[#f97316] tracking-widest uppercase">Vulnerability</span>
          </div>
          <div className="text-[#e6edf3] font-semibold text-sm">{result.cwe}</div>
          <div className="text-[#7d8590] text-xs mt-1">
            Formal proof of violation generated — Z3 solver confirmed constraint violation exists.
          </div>
        </div>
      )}

      {/* Proof text */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#7d8590] tracking-wider uppercase">Z3 Proof Output</span>
          <span className="text-xs text-[#484f58]">formal verification result</span>
        </div>
        <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 max-h-40 overflow-y-auto">
          <pre className="proof-block text-[#8b949e]">{result.proof}</pre>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0d1117]/60 border border-[#30363d] rounded-lg px-4 py-3">
          <div className="text-xs text-[#7d8590] mb-1 uppercase tracking-wider">Language</div>
          <div className="text-sm font-semibold text-[#e6edf3]">{result.language}</div>
        </div>
        <div className="bg-[#0d1117]/60 border border-[#30363d] rounded-lg px-4 py-3">
          <div className="text-xs text-[#7d8590] mb-1 uppercase tracking-wider">Constraints Checked</div>
          <div className="text-sm font-semibold text-[#e6edf3]">{result.constraints_checked}</div>
        </div>
        <div className="col-span-2 bg-[#0d1117]/60 border border-[#30363d] rounded-lg px-4 py-3">
          <div className="text-xs text-[#7d8590] mb-1 uppercase tracking-wider">Project</div>
          <div className="text-sm font-semibold text-[#e6edf3]">{result.project || '—'}</div>
        </div>
      </div>

      {/* Signature */}
      <div>
        <div className="text-xs font-semibold text-[#7d8590] tracking-wider uppercase mb-2">
          Certificate Signature — {result.signature.algorithm}
        </div>
        <div className="bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3">
          <code className="proof-block text-[#484f58] text-[10.5px] break-all">
            {result.signature.signature_hex.slice(0, 96)}…
          </code>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-[#484f58] font-mono border-t border-[#30363d] pt-4">
        Signed: {formattedTs}
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => downloadCert(result.certificate_b64, result.certificate_id)}
          className="btn-primary flex items-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
        >
          <DownloadIcon className="w-4 h-4" />
          Download Certificate
        </button>
        <button
          onClick={() => void handleCopy()}
          className="flex items-center gap-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4 text-[#3fb950]" />
              <span className="text-[#3fb950]">Copied</span>
            </>
          ) : (
            <>
              <CopyIcon className="w-4 h-4" />
              Share Proof
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function EmptyResults() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8 py-16">
      <div className="w-16 h-16 rounded-2xl bg-[#161b22] border border-[#30363d] flex items-center justify-center">
        <ShieldIcon className="w-8 h-8 text-[#30363d]" />
      </div>
      <div>
        <div className="text-[#484f58] font-medium mb-1">No analysis yet</div>
        <div className="text-[#30363d] text-sm">
          Paste your code and click Analyze, or run the demo to see a Z3 proof certificate.
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2">
        {['CMMC L2', 'FedRAMP', 'SOC2'].map((badge) => (
          <span key={badge} className="text-xs text-[#30363d] border border-[#21262d] rounded px-2 py-1">
            {badge}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function WickSecurityPage() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<Language>('C')
  const [project, setProject] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<WickResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const analyzerRef = useRef<HTMLDivElement>(null)

  const scrollToAnalyzer = () => {
    analyzerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) {
      setError('Please paste some code to analyze.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await analyzeCode(code, language, project)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Check that the backend is reachable.')
    } finally {
      setLoading(false)
    }
  }, [code, language, project])

  const handleDemo = useCallback(async () => {
    setCode(DEMO_CODE)
    setLanguage('C')
    setProject('CWE-190 Demo')
    setLoading(true)
    setError(null)
    setResult(null)
    scrollToAnalyzer()
    try {
      const res = await runDemo()
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo failed. Check backend connectivity.')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d1117', color: '#e6edf3' }}>

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[#21262d]" style={{ backgroundColor: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <ShieldIcon className="w-6 h-6 text-[#0ea5e9]" />
            <span className="font-bold text-[#e6edf3] tracking-tight text-lg">
              WICK <span className="text-[#0ea5e9]">SECURITY</span>
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            {['Platform', 'Docs', 'Pricing'].map((link) => (
              <span key={link} className="text-sm text-[#7d8590] hover:text-[#e6edf3] cursor-pointer transition-colors font-medium">
                {link}
              </span>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={scrollToAnalyzer}
            className="btn-primary bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16">

        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#0ea5e9]/10 border border-[#0ea5e9]/25 rounded-full px-4 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9]" />
            <span className="text-xs font-semibold text-[#0ea5e9] tracking-wider uppercase">
              Z3 Formal Verification Engine v2.4
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-none mb-6">
            <span className="gradient-text">Code that&apos;s proven safe.</span>
          </h1>
          <p className="text-lg text-[#7d8590] leading-relaxed max-w-2xl mx-auto">
            Wick Security uses Z3 formal verification to prove your code is free of critical vulnerabilities
            — generating court-grade certificates for compliance auditors.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center mt-12">
          <div className="flex flex-wrap items-center justify-center divide-x divide-[#30363d] border border-[#30363d] rounded-xl bg-[#161b22] overflow-hidden">
            <StatBadge value="&lt; 5 seconds" label="Per analysis" />
            <StatBadge value="Z3 Formal Proof" label="Mathematical certainty" />
            <StatBadge value="ML-DSA Signed" label="Tamper-proof certs" />
            <StatBadge value="CMMC / FedRAMP" label="Compliance ready" />
          </div>
        </div>
      </section>

      {/* ── Code Analyzer ───────────────────────────────────────────────────── */}
      <section ref={analyzerRef} className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Left — Code Input */}
          <div className="flex flex-col gap-4">

            {/* Panel header */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">

              {/* Editor top bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#21262d]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-xs text-[#484f58] ml-2 font-mono">analysis.c</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Language selector */}
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="appearance-none bg-[#0d1117] border border-[#30363d] text-[#8b949e] text-xs font-medium px-3 py-1.5 pr-7 rounded-md cursor-pointer hover:border-[#0ea5e9] focus:outline-none focus:border-[#0ea5e9] transition-colors"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58] pointer-events-none" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Code textarea */}
              <div className="relative">
                <textarea
                  className="code-editor w-full bg-[#0d1117] text-[#8b949e] px-5 py-4 min-h-80 focus:text-[#e6edf3] transition-colors"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={DEMO_CODE}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </div>
            </div>

            {/* Project name */}
            <div className="flex gap-3">
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Project name (optional)"
                className="flex-1 bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-sm px-4 py-2.5 rounded-lg placeholder-[#484f58] focus:outline-none focus:border-[#0ea5e9] transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-[#f97316]/8 border border-[#f97316]/30 rounded-lg px-4 py-3 text-sm text-[#f97316]">
                <AlertTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 items-center flex-wrap">
              <button
                onClick={() => void handleAnalyze()}
                disabled={loading}
                className="btn-primary flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0ea5e9] text-white text-sm font-bold px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <span>Analyzing</span>
                    <LoadingDots />
                  </>
                ) : (
                  <>
                    <ShieldIcon className="w-4 h-4" />
                    <span>Analyze Code</span>
                  </>
                )}
              </button>

              <button
                onClick={() => void handleDemo()}
                disabled={loading}
                className="text-[#0ea5e9] text-sm font-medium hover:text-[#38bdf8] transition-colors disabled:opacity-40 underline underline-offset-2 decoration-dotted"
              >
                Run Demo (C Integer Overflow)
              </button>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-[#484f58]">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-[#3fb950]" />
                <span>Code analyzed in-memory only</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#484f58]">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-[#3fb950]" />
                <span>Certificates ML-DSA signed</span>
              </div>
            </div>
          </div>

          {/* Right — Results Panel */}
          <div className="flex flex-col">
            <div className="sticky top-24">
              {result ? (
                <ResultsPanel result={result} />
              ) : (
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl min-h-96">
                  <EmptyResults />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-[#21262d]" style={{ backgroundColor: '#0d1117' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-[#0ea5e9] tracking-widest uppercase mb-3">Why Wick</div>
            <h2 className="text-3xl font-bold text-[#e6edf3] tracking-tight">
              Proof, not promises.
            </h2>
            <p className="text-[#7d8590] mt-3 max-w-xl mx-auto">
              Traditional SAST tools find patterns. Wick Security generates mathematical proofs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FeatureCard
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
              title="Formal Z3 Verification"
              description="Not just testing. Mathematical proof that violations cannot occur — powered by Microsoft Research's Z3 theorem prover."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              }
              title="Signed Certificates"
              description="Every proof is ML-DSA-65 post-quantum signed and timestamped. Immutable audit trail built-in — survives algorithm rotation."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              title="Compliance Ready"
              description="CMMC Level 2, FedRAMP, SOC2 — prove compliance in hours, not months. Certificate bundles accepted by framework auditors."
            />
          </div>

          {/* Comparison table */}
          <div className="mt-12 bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 text-xs font-semibold text-[#484f58] tracking-wider uppercase px-6 py-3 border-b border-[#30363d] bg-[#21262d]">
              <span>Capability</span>
              <span className="text-center text-[#7d8590]">Traditional SAST</span>
              <span className="text-center text-[#0ea5e9]">Wick Security</span>
            </div>
            {[
              ['Finds known patterns', true, true],
              ['Proves absence of bugs', false, true],
              ['Generates signed certificates', false, true],
              ['Court-admissible output', false, true],
              ['CMMC/FedRAMP artifact', false, true],
              ['Post-quantum signatures', false, true],
            ].map(([label, traditional, wick]) => (
              <div key={String(label)} className="grid grid-cols-3 px-6 py-3.5 border-b border-[#21262d] last:border-0 hover:bg-[#21262d]/40 transition-colors">
                <span className="text-sm text-[#8b949e]">{String(label)}</span>
                <div className="flex justify-center">
                  {traditional ? (
                    <CheckIcon className="w-4 h-4 text-[#3fb950]" />
                  ) : (
                    <span className="text-[#30363d] text-sm">—</span>
                  )}
                </div>
                <div className="flex justify-center">
                  {wick ? (
                    <CheckIcon className="w-4 h-4 text-[#0ea5e9]" />
                  ) : (
                    <span className="text-[#30363d] text-sm">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="border-t border-[#21262d]" style={{ backgroundColor: '#0d1117' }}>
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0ea5e9]/10 border border-[#0ea5e9]/25 mb-8">
            <ShieldCheckIcon className="w-7 h-7 text-[#0ea5e9]" />
          </div>
          <h2 className="text-4xl font-bold text-[#e6edf3] tracking-tight mb-4">
            Ready to prove your code is safe?
          </h2>
          <p className="text-[#7d8590] text-lg mb-10 leading-relaxed">
            Join security teams at financial institutions and government agencies who trust Wick Security
            for formal verification and compliance certification.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToAnalyzer}
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold text-base px-8 py-3.5 rounded-lg"
            >
              <ShieldIcon className="w-5 h-5" />
              Start Free Analysis
            </button>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#e6edf3] font-semibold text-base px-8 py-3.5 rounded-lg transition-colors">
              Schedule a Demo
            </button>
          </div>

          {/* Logos / trust row */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 pt-8 border-t border-[#21262d]">
            {['CMMC L2', 'FedRAMP', 'SOC 2 Type II', 'NIST 800-53', 'ISO 27001'].map((badge) => (
              <span
                key={badge}
                className="text-xs font-semibold text-[#484f58] border border-[#21262d] rounded-md px-3 py-1.5 tracking-wide"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#21262d]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">

            <div className="flex items-center gap-2.5">
              <ShieldIcon className="w-5 h-5 text-[#0ea5e9]" />
              <span className="font-bold text-[#7d8590] text-sm">
                Wick Security Inc. — Proof-Based Cybersecurity Infrastructure
              </span>
            </div>

            <div className="flex items-center gap-6">
              {['Privacy', 'Terms', 'Security'].map((link) => (
                <span key={link} className="text-xs text-[#484f58] hover:text-[#7d8590] cursor-pointer transition-colors">
                  {link}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#21262d] flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-xs text-[#30363d]">
              &copy; 2026 Wick Security Inc. | Toronto, Canada
            </p>
            <p className="text-xs text-[#30363d]">
              Powered by Z3 Theorem Prover (Microsoft Research) · ML-DSA-65 Post-Quantum Signatures
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
