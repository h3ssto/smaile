import { defineConfig } from 'vite'

export default defineConfig({
  base: '/smaile/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
