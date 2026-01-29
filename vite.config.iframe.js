import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite Configuration for Iframe Build
 * Builds the iframe-based editor as a standalone HTML + JS bundle
 */
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for assets
  define: {
    '__VERSION__': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({}),
  },
  build: {
    outDir: 'dist/iframe',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'iframe.html'),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    minify: 'esbuild',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['fabric'],
    exclude: ['@imgly/background-removal', 'onnxruntime-web'],
  },
  resolve: {
    alias: {
      'onnxruntime-web/webgpu': 'onnxruntime-web',
      'onnxruntime-web/webnn': 'onnxruntime-web',
    },
  },
});
