import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev proxy: rewrites /api → Render backend so VITE_BACKEND_URL stays empty
    proxy: {
      '/api': {
        target: 'https://new-1-943x.onrender.com',
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
