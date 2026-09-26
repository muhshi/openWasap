import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  appType: 'spa', // Enable SPA fallback for client-side routing
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || '0.2.1'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: 8080,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:2785',
        changeOrigin: true,
        secure: false,
      },
      '/auth/sipetra': {
        target: 'http://127.0.0.1:2785',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth\/sipetra/, '/api/auth/sipetra'),
      },
      '/socket.io': {
        target: 'http://127.0.0.1:2785',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
