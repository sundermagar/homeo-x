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
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('node_modules')) return;

          // ── Critical path (smallest possible) ──
          if (normalizedId.includes('react-dom')) return 'vendor-react';
          if (normalizedId.includes('/react/') || normalizedId.includes('react-is') || normalizedId.includes('scheduler')) return 'vendor-react';
          if (normalizedId.includes('react-router') || normalizedId.includes('@remix-run')) return 'vendor-router';

          // ── Data layer (loaded after shell renders) ──
          if (normalizedId.includes('@tanstack')) return 'vendor-query';
          if (normalizedId.includes('axios') || normalizedId.includes('zod') || normalizedId.includes('zustand')) return 'vendor-forms';

          // ── Heavy feature libs (lazy loaded with pages) ──
          if (normalizedId.includes('date-fns')) return 'vendor-datefns';
          if (normalizedId.includes('lucide-react')) return 'vendor-icons';
          if (normalizedId.includes('recharts') || normalizedId.includes('d3-') || normalizedId.includes('victory')) return 'vendor-charts';
          if (normalizedId.includes('@fullcalendar')) return 'vendor-calendar';
          if (normalizedId.includes('livekit')) return 'vendor-video';
          if (normalizedId.includes('openai')) return 'vendor-ai';

          // ── Everything else ──
          return 'vendor-utils';
        },
      },
    },
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
