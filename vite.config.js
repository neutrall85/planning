import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    babel: {
      plugins: [],
    },
  })],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  build: {
    // Code splitting настройки
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') && id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n';
            }
            if (id.includes('zod')) {
              return 'validation';
            }
            return 'vendor';
          }
        },
      },
    },
    // Минификация
    minify: 'esbuild',
    // Генерация sourcemaps для production
    sourcemap: false,
    // Оптимизация размера чанков
    chunkSizeWarningLimit: 500,
  },
  // Оптимизация зависимостей для dev
  optimizeDeps: {
    include: ['react', 'react-dom', 'i18next', 'zod'],
  },
})
