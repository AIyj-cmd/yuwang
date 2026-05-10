import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist',
    cssMinify: false,
    rollupOptions: {
      output: {
        // Keep the main frontend chunk small by splitting common heavy deps.
        // Admin pages are already lazy-loaded via route-level `() => import(...)`,
        // so this only affects vendor code shared by front-of-house pages.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('lucide-vue-next')) return 'vendor-icons';
          if (id.includes('@mmt817/pixel-ui')) return 'vendor-pixel-ui';
          if (id.includes('vue-router')) return 'vendor-vue-router';
          if (id.includes('/@vue/') || id.includes('/vue/')) return 'vendor-vue';
          return 'vendor';
        }
      }
    }
  }
});
