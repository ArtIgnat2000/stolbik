import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json'

const base = process.env.VITE_BASE?.trim() || '/'
const commit = process.env.VITE_COMMIT_SHA || process.env.GITHUB_SHA || (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
})()

export default defineConfig(({ mode }) => ({
  base: base.endsWith('/') ? base : `${base}/`,
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  plugins: [
    react(),
    ...(mode === 'test'
      ? []
      : VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icon.svg'],
            manifest: {
              name: 'Столбик — учимся считать',
              short_name: 'Столбик',
              description: 'Тёплая и спокойная тренировка сложения и вычитания столбиком.',
              lang: 'ru',
              theme_color: '#7560df',
              background_color: '#f8f7ff',
              display: 'standalone',
              orientation: 'portrait',
              start_url: base,
              scope: base,
              icons: [
                {
                  src: `${base}icon.svg`,
                  sizes: 'any',
                  type: 'image/svg+xml',
                  purpose: 'any maskable'
                }
              ]
            },
            workbox: {
              navigateFallback: `${base}index.html`,
              globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
              cleanupOutdatedCaches: true,
              clientsClaim: true
            }
          }))
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __COMMIT_SHA__: JSON.stringify(commit.slice(0, 8))
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 200
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: true,
    clearMocks: true
  }
}))
