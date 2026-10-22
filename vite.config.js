import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// A static build's player index starts fetching its player list from the page itself, so
// it downloads alongside the app instead of after it. The URL is src/api.js's for
// profiles.json (a different one would be fetched twice).
const preloadPlayers = () => ({
  name: 'preload-players',
  transformIndexHtml(html, ctx) {
    const env = loadEnv(ctx.server ? 'development' : 'production', process.cwd(), 'VITE_')
    if (env.VITE_STATIC !== '1') return html
    const base = process.env.VITE_BASE || '/'
    const url = `${base.replace(/\/$/, '')}/api/profiles.json${env.VITE_DATA_VERSION ? `?v=${env.VITE_DATA_VERSION}` : ''}`
    const script = `if (location.pathname.replace(/index\\.html$/, '').replace(/\\/?$/, '/') === ${JSON.stringify(base)}) { const l = document.createElement('link'); l.rel = 'preload'; l.as = 'fetch'; l.crossOrigin = 'anonymous'; l.href = ${JSON.stringify(url)}; document.head.appendChild(l) }`
    return [{ tag: 'script', children: script, injectTo: 'head-prepend' }]
  }
})

// https://vite.dev/config/
// VITE_BASE is the path the site is served from: '/' locally and on GitHub
// Pages, whose custom domain (data.thinkingbasketball.net) serves it at the root.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), preloadPlayers()],
})
