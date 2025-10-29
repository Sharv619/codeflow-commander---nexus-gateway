import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
      ,server: {
        host: true,
        proxy: {
          '/api': {
            target: env.VITE_API_PROXY || 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
          },
          '/results': {
            target: env.VITE_API_PROXY || 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
          },
          '/analyze': {
            target: env.VITE_API_PROXY || 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
          }
        }
      }
    };
});
