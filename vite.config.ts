import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// Build modes:
//   default (chrome)  → dist/chrome/  + MV3 manifest
//   --mode compat      → dist/compat/  + MV2 manifest

export default defineConfig(({ mode }) => {
  const isCompat = mode === 'compat'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        shared: resolve(__dirname, 'src/shared'),
      },
    },
    base: '',
    build: {
      outDir: `dist/${isCompat ? 'compat' : 'chrome'}`,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          // Only build popup — background & content scripts built via esbuild for IIFE
          popup: resolve(__dirname, 'popup/index.html'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    // Prevent Vite from injecting its client code into content/background scripts
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'compat' ? 'compat' : 'production'),
    },
  }
})
