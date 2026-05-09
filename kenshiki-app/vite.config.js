import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev proxy: rewrites /api → Render backend so VITE_BACKEND_URL stays empty
    proxy: {
      '/api': {
        target: 'https://api-new-1-f617.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Ensure Vite does not inline large assets (keeps bundle clean for Vercel)
    assetsInlineLimit: 4096,
    sourcemap: false,
  },
})
