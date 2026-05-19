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
    build: {
      outDir: `dist/${isCompat ? 'compat' : 'chrome'}`,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          // Popup entry with HTML wrapper
          popup: resolve(__dirname, 'popup/index.html'),
          // Background & content scripts as plain JS entries
          background: resolve(__dirname, 'src/background/index.ts'),
          'content/1688': resolve(__dirname, 'src/content/1688-sidebar.ts'),
          'content/shopee': resolve(__dirname, 'src/content/shopee-sidebar.ts'),
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
