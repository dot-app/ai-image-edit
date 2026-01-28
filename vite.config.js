import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: ['@imgly/background-removal', 'onnxruntime-web']
  },
  resolve: {
    alias: {
      'onnxruntime-web/webgpu': 'onnxruntime-web',
      'onnxruntime-web/webnn': 'onnxruntime-web'
    }
  }
})
