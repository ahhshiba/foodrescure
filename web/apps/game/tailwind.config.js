/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // UI1 high-brightness tech palette (brief §5).
        neon: {
          green: '#39ff14',
          magenta: '#FF003C',
          cyan: '#00F0FF',
          blue: '#1f8fff',
        },
        void: '#0F172A',
        panel: '#0b1322',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 8px rgba(57,255,20,0.7), 0 0 16px rgba(57,255,20,0.4)',
        magenta: '0 0 8px rgba(255,42,109,0.7), 0 0 18px rgba(255,42,109,0.4)',
      },
    },
  },
  plugins: [],
};
