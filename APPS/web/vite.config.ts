import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      '@app/shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api/leonas': {
        target: 'https://partnersv1.pinbot.ai',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/leonas/, '')
      }
    }
  }
});
