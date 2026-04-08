import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // gl-bench's main entry is a UMD bundle without a default export, which
      // Rolldown can't import. Force the ESM module build instead.
      'gl-bench': path.resolve(__dirname, 'node_modules/gl-bench/dist/gl-bench.module.js'),
    },
  },
})
