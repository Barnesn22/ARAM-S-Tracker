import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  define: {
    __STATIC__: JSON.stringify(process.env.VITE_STATIC === 'true')
  },

  plugins: [
    react(),
    tailwindcss(),
  ],
  base: "./",

  build: {
    outDir: "dist-vite",
    sourcemap: false
  },
})