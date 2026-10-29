import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://backend-50044295489.development.catalystappsail.in',
        changeOrigin: true,
        secure: true
      }
    }
  },
  // Provide fallback define values so CI/Slate builds that lack .env.production
  // still compile. Real overrides come from .env.production (untracked).
  define: {
    // VITE_DEMO_MODE: enable demo credentials in production builds by default.
    // Set to 'false' in .env.production to disable.
    'import.meta.env.VITE_DEMO_MODE': JSON.stringify(
      process.env.VITE_DEMO_MODE ?? (mode === 'production' ? 'true' : 'false')
    ),
    // VITE_API_BASE_URL: fallback for CI builds without .env.production.
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL ?? (mode === 'production'
        ? 'https://backend-50044295489.development.catalystappsail.in'
        : '')
    ),
  },
}))
