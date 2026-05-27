import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Wick Security — Formal Code Verification',
  description:
    'Wick Security uses Z3 formal verification to prove your code is free of critical vulnerabilities. Generate court-grade certificates for CMMC, FedRAMP, and SOC2 compliance.',
  keywords: ['formal verification', 'Z3', 'code security', 'CMMC', 'FedRAMP', 'DevSecOps', 'proof certificates'],
  authors: [{ name: 'Wick Security Inc.' }],
  openGraph: {
    title: 'Wick Security — Formal Code Verification',
    description: 'Z3 proof certificates for compliance auditors. Code that is proven safe.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ backgroundColor: '#0d1117', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
