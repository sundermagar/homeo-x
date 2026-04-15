import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mmc/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@mmc/validation': path.resolve(__dirname, '../../packages/validation/src/index.ts'),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom')) return 'react-vendor';
          if (id.includes('node_modules/@tanstack')) return 'query';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/recharts')) return 'charts';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:3000', ws: true, changeOrigin: true },
      '/transcription': { target: 'http://127.0.0.1:3000', ws: true, changeOrigin: true },
    },
  },
});
