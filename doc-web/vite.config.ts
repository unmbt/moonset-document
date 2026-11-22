import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export default defineConfig({
  root: __dirname,
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          xterm: ['@xterm/xterm', '@xterm/addon-fit'],
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
});
