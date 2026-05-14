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
  // ── Optimization for Dev Speed ──
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      '@tanstack/react-query',
      'recharts',
      'date-fns',
      'axios',
      'clsx'
    ],
  },
  build: {
    target: 'esnext',
    minify: 'esbuild', // Faster than terser
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Grouping related dependencies into larger chunks to reduce HTTP request overhead
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('router')) return 'vendor-core';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
            if (id.includes('@fullcalendar')) return 'vendor-calendar';
            if (id.includes('livekit')) return 'vendor-video';
            return 'vendor-utils'; // Group smaller utils together
          }
        },
      },
    },
  },
  server: {
    allowedHosts: [
      'frying-deviancy-rocklike.ngrok-free.dev'
    ],
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false },
      '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: false },
      '/socket.io': { target: 'http://127.0.0.1:3000', ws: true, changeOrigin: false },
    },
  },
});
