import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: { proof: '#00ff88' },
        red: { threat: '#ff3366' },
        yellow: { warn: '#ffcc00' }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      }
    }
  },
  plugins: []
}

export default config
