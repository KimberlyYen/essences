/**
 * Vite 設定。
 * /api proxy 到 mock 後端 8000，前端 fetch('/api/...') 不用寫死 host。
 * test.environment = node：欄位規則跟 SSE parser 都是純函式，不需要 jsdom。
 */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
