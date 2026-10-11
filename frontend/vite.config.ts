import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: 'http://localhost:5000', // backend URL (adjust if you change port)
        changeOrigin: true,
        secure: false,
        // optionally rewrite the path if your backend routes are not prefixed with /api
        // rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
});
