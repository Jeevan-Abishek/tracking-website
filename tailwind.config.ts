import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B1120',
        surface: '#131B2E',
        surface2: '#1B2740',
        amber: '#FFB020',
        teal: '#22D3B5',
        muted: '#8792A6',
        danger: '#FF5D5D',
        line: '#26314A'
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace']
      },
      borderRadius: {
        xl2: '20px'
      }
    }
  },
  plugins: []
};

export default config;
