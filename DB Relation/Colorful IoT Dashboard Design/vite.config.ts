import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Vite config untuk Production Build (Docker)
// Plugin Figma Make dihapus — tidak tersedia di CI/Docker environment
export default defineConfig({
  base: '/',
  build: {
    sourcemap: false,
    minify: true,
    outDir: 'dist',
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/gateway': {
        target: 'http://iot-gateway:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gateway/, ''),
      },
    },
  },
})
