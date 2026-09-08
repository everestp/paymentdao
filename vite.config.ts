import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },

  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
