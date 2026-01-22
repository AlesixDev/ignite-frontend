// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isElectron = process.env.VITE_ELECTRON === 'true';

export default defineConfig({
  plugins: [react()],
  base: isElectron ? './' : '/',  // 🔑 Relative paths for Electron file:// URLs
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
})
