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
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router')) {
            return 'vendor';
          }
          if (id.includes('node_modules/@mmt817/pixel-ui')) {
            return 'pixel-ui';
          }
          if (id.includes('/src/admin/')) {
            return 'admin';
          }
        }
      }
    }
  }
});
