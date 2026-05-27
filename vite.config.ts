import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.API_PORT ?? env.PORT ?? '3101';
  const apiTarget = env.VITE_API_TARGET ?? env.API_PROXY_TARGET ?? env.BACKEND_URL ?? `http://127.0.0.1:${apiPort}`;

  return {
    plugins: [vue()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
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
  };
});
