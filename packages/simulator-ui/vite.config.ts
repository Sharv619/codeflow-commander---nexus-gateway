import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://aistudiocdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; img-src 'self' data:; connect-src 'self' http://backend:3001; font-src 'self' https: data:; object-src 'none'; base-uri 'self';"
    }
  },
  build: {
    rollupOptions: {
      external: [
        '@apollo/client',
        '@apollo/client/utilities',
        '@apollo/client/core',
        '@apollo/client/link/http',
        '@apollo/client/link/context'
      ],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  }
});
