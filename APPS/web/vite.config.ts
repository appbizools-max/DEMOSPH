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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'vendor-icons': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    proxy: {
      '/api/leonas': {
        target: 'https://partnersv1.pinbot.ai',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/leonas/, '')
      },
      '/api/sms': {
        target: 'https://smslogin.co',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/sms/, '')
      }
    }
  }
});
