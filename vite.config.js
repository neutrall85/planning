import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // React и react-jsx-runtime выбирают dev/prod сборку по этому флагу.
    // 'production' — попадает production-сборка React (без dev-предупреждений).
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    minify: false,                  // без минификации
    cssMinify: false,               // CSS тоже как есть
    sourcemap: true,                // удобно для отладки
    rollupOptions: {
      output: {
        // всё в один JS-файл
        inlineDynamicImports: true,
        entryFileNames: 'bundle.js',
        chunkFileNames: 'bundle.js',
        assetFileNames: 'bundle.[ext]',
        manualChunks: undefined,
      },
    },
  },
})