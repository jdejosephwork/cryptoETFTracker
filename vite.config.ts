import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/fmp-api': {
        target: 'https://financialmodelingprep.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fmp-api/, ''),
        secure: true,
      },
      '/btcetf-api': {
        target: 'https://www.btcetfdata.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/btcetf-api/, ''),
        secure: true,
      },
    },
  },
})
