import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// VITE_BASE is the path the site is served from: '/tbball/' on GitHub
// Pages (.github/workflows/pages.yml), '/' locally.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
})
