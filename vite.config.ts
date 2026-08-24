import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/geoquiz/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        'country-capital': fileURLToPath(new URL('./country-capital/index.html', import.meta.url)),
        'shape-capital': fileURLToPath(new URL('./shape-capital/index.html', import.meta.url)),
        'shape-neighbours': fileURLToPath(new URL('./shape-neighbours/index.html', import.meta.url)),
        'shape-high-point': fileURLToPath(new URL('./shape-high-point/index.html', import.meta.url)),
        'flag-country': fileURLToPath(new URL('./flag-country/index.html', import.meta.url)),
        'border-countries': fileURLToPath(new URL('./border-countries/index.html', import.meta.url)),
        '404': fileURLToPath(new URL('./404.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
