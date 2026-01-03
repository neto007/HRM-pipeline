import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/projects': 'http://127.0.0.1:9007',
      '/rlcoder': 'http://127.0.0.1:9007',
      '/status': 'http://127.0.0.1:9007',
      '/index-l2j': 'http://127.0.0.1:9007',
      '/index-status': 'http://127.0.0.1:9007',
      '/transcribe': 'http://127.0.0.1:9007',
      '/repo': 'http://127.0.0.1:9007',
      '/logs': 'http://127.0.0.1:9007',
      '/migration': 'http://127.0.0.1:9007',
    },
  },
})
