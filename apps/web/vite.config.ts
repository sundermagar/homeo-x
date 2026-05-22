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
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
  server: {
    allowedHosts: [
      'frying-deviancy-rocklike.ngrok-free.dev',
      'triumphantly-coloristic-lan.ngrok-free.dev'
    ],
    proxy: {
      '/api': { 
        target: 'http://127.0.0.1:3000', 
        changeOrigin: false,
        timeout: 1800000, // 30 minutes timeout
        proxyTimeout: 1800000
      },
      '/uploads': { 
        target: 'http://127.0.0.1:3000', 
        changeOrigin: false 
      },
      '/socket.io': { 
        target: 'http://127.0.0.1:3000', 
        ws: true, 
        changeOrigin: false,
        timeout: 1800000,
        proxyTimeout: 1800000
      },
    },
  },
});
