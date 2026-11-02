import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  root: fileURLToPath(new URL('./playground', import.meta.url)),
  base: './',
  plugins: [vue()],
  resolve: {
    dedupe: ['vue'],
  },
  build: {
    outDir: fileURLToPath(new URL('./playground-dist', import.meta.url)),
    emptyOutDir: true,
  },
})
