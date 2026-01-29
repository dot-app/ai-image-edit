import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite Library Build Configuration
 * Builds only the library entry point (EditorModal, utilities)
 * CSS is bundled separately in the iframe build
 */
export default defineConfig({
  plugins: [react()],
  define: {
    '__VERSION__': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({}),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'AIImageEdit',
      fileName: (format) => {
        if (format === 'es') return 'ai-image-editor.es.mjs';
        if (format === 'umd') return 'ai-image-editor.umd.js';
        return `ai-image-editor.${format}.js`;
      },
    },
    rollupOptions: {
      output: [
        {
          format: 'es',
          entryFileNames: 'ai-image-editor.es.mjs',
          chunkFileNames: 'chunks/[name]-[hash].mjs',
        },
        {
          format: 'umd',
          name: 'AIImageEdit',
          entryFileNames: 'ai-image-editor.umd.js',
          inlineDynamicImports: true,
          exports: 'named',
        },
      ],
    },
    cssCodeSplit: false,
    // Don't emit CSS for library build (CSS is in iframe build)
    cssMinify: true,
    minify: 'esbuild',
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: false, // Don't clean - iframe build goes here too
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
