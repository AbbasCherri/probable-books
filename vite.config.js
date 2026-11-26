import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// In development the app calls /api on its own origin and Vite forwards it to the local API,
// so no VITE_API_URL or CORS setup is needed. API_PROXY_TARGET overrides the address.
const apiProxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET || 'http://localhost:4000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // Unit tests run against the in-memory mock API, never a server.
    env: { VITE_API_MOCK: '1' },
    setupFiles: ['./src/test/setup.js'],
    css: false,
    include: ['src/**/*.test.{js,jsx}'],
    exclude: ['node_modules', 'dist', 'e2e', 'e2e-artifacts'],
  },
})
