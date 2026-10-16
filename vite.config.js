import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Forward API calls to the Flask inference service (backend/app.py, port 5000).
// The browser therefore makes same-origin requests, so no CORS config is needed.
const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev server (npm run dev) proxies /api to Flask.
  server: {
    proxy: apiProxy,
  },
  // Static preview of the production build (npm run preview) proxies /api too.
  preview: {
    proxy: apiProxy,
  },
})
