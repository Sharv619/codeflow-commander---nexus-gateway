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
          // Proxy /api/* to backend. Use VITE_API_PROXY target if provided, otherwise
          // default to host.docker.internal for Windows, or backend:3001 for other platforms
          '^/api/.*': {
            target: env.VITE_API_PROXY || (process.platform === 'win32' ? 'http://host.docker.internal:3001' : 'http://backend:3001'),
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            secure: false,
          },
        }
      }
    };
});
