import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Two entries: the existing vanilla tracker (index.html) is left untouched and
// copied through; leo3d.html is the React/r3f page the 3D paw picker is built in.
export default defineConfig({
  plugins: [react()],
  // One copy of three, or r3f/drei and app code get separate instances.
  resolve: { dedupe: ['three', 'react', 'react-dom'] },
  // Honour PORT so the dev server can move off 5173 when it is taken.
  server: { port: Number(process.env.PORT) || 5173 },
  build: {
    rollupOptions: {
      output: {
        // Split the vendor code out so an app change does not force a
        // re-download of three, which is the bulk of the payload.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          return 'three'
        },
      },
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        leo3d: resolve(import.meta.dirname, 'leo3d.html'),
      },
    },
  },
})
