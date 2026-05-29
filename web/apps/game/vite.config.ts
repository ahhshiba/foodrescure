import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// Dev server proxies API + WebSocket to the backend so the SPA can use
// same-origin relative URLs (/api/v1, /ws).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@glitch/contracts': fileURLToPath(
        new URL('../../packages/contracts/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
});
