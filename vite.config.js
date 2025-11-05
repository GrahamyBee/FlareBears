import { defineConfig } from 'vite'

// Configure base for GitHub Pages deployment under /FlareBears/
export default defineConfig({
  base: '/FlareBears/',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'web-dist'
  }
})