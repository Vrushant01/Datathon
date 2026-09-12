import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://backend-50044295489.development.catalystappsail.in',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
