/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        zen: {
          bg: '#fcfaf8',
          panel: '#ffffff',
          text: '#4a4a4a',
          light: '#8c8c8c',
          border: '#eae5de',
          accent: '#8ba192',
          alert: '#c98a87',
          primary: '#b59e86',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans TC"', 'sans-serif'],
        serif: ['"Noto Serif TC"', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        zen: '0 4px 20px rgba(0, 0, 0, 0.03)',
        'zen-hover': '0 6px 24px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
