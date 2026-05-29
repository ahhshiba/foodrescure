/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#39ff14',
          magenta: '#ff2a6d',
          cyan: '#05d9e8',
          blue: '#1f8fff',
        },
        void: '#05060a',
        panel: '#0b0f1a',
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
