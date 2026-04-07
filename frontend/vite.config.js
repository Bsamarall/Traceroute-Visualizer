/**
 * vite.config.js - Configuração do Vite
 * Proxy para o backend em desenvolvimento evita problemas de CORS
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Redireciona /api para o backend em desenvolvimento
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          globe: ['globe.gl'],
          vendor: ['react', 'react-dom', 'axios'],
        },
      },
    },
  },
});
