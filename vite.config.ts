/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/yalla/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Yalla!',
        short_name: 'Yalla',
        description: "Apprends l'anglais et l'arabe en famille",
        theme_color: '#58cc02',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        lang: 'fr',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // les mp3 ne sont PAS préchargés (trop lourds) : mis en cache à la 1re écoute
        runtimeCaching: [
          {
            urlPattern: /\/audio\/.+\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'yalla-audio',
              expiration: { maxEntries: 2500, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts'
  }
})
