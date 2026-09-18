import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // React и react-jsx-runtime выбирают dev/prod сборку по этому флагу.
    // Ставим 'development' - попадёт development-сборка с полными
    // предупреждениями вместо "Minified React error #...".
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  build: {
    minify: false,                  // отключаем минификацию
    cssMinify: false,               // CSS тоже не минифицируем
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