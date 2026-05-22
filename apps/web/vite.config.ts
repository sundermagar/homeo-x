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
          if (!id.includes('node_modules')) return;

          // ── Critical path (smallest possible) ──
          if (id.includes('react-dom')) return 'vendor-react';
          if (id.includes('/react/') || id.includes('react-is') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('react-router') || id.includes('@remix-run')) return 'vendor-router';

          // ── Data layer (loaded after shell renders) ──
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('axios') || id.includes('zod') || id.includes('zustand')) return 'vendor-forms';

          // ── Heavy feature libs (lazy loaded with pages) ──
          if (id.includes('date-fns')) return 'vendor-datefns';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts';
          if (id.includes('@fullcalendar')) return 'vendor-calendar';
          if (id.includes('livekit')) return 'vendor-video';
          if (id.includes('openai')) return 'vendor-ai';

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
