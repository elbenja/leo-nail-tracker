import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Two entries: the existing vanilla tracker (index.html) is left untouched and
// copied through; leo3d.html is the React/r3f page the 3D paw picker is built in.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        leo3d: resolve(import.meta.dirname, 'leo3d.html'),
      },
    },
  },
})
