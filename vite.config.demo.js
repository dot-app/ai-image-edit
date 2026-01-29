import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite config for running the demo page
 * Uses the library source directly for development
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: '/demo/index.html',
  },
  resolve: {
    alias: {
      'ai-image-editor': resolve(__dirname, 'src/index.js'),
    },
  },
  optimizeDeps: {
    include: ['fabric'],
    exclude: ['@imgly/background-removal', 'onnxruntime-web'],
  },
});
