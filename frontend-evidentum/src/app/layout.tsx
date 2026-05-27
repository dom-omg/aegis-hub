import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EVIDENTUM — Proof Intelligence Platform',
  description: 'Formally verified blockchain forensics for law enforcement and prosecutors. Machine-signed. Court-ready.',
  keywords: ['blockchain forensics', 'law enforcement', 'formal verification', 'proof intelligence', 'court evidence'],
  openGraph: {
    title: 'EVIDENTUM — Proof Intelligence Platform',
    description: 'Blockchain evidence that holds up in court.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚖</text></svg>" />
      </head>
      <body
        className="font-mono antialiased min-h-screen"
        style={{ background: '#0a0a0a', color: '#e0e0e0' }}
      >
        {children}
      </body>
    </html>
  )
}
