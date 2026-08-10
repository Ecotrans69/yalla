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
        icons: []
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts'
  }
})
