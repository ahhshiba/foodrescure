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
          amber: '#ffb627',
        },
        void: '#04050a',
        panel: '#0b1018',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
