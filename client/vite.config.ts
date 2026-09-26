import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.png'],
      manifest: {
        name: 'Fios — Academic Command Center',
        short_name: 'Fios',
        description: 'AI flashcards, quizzes, code lab, tutor, and focus tools.',
        theme_color: '#07090e',
        background_color: '#07090e',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon.png', sizes: '512x512', type: 'image/png' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Safety net above Workbox's 2 MiB default for mid-size vendor chunks.
        // Mermaid/elk/cytoscape (~5 MB) is excluded from precache below and
        // loaded on demand via dynamic import in MermaidDiagram.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/vendor-diagrams-*.js'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Never cache API — NetworkFirst previously stored HTML 404s for /api/*
            // and broke iCal sync / summarize with stale non-JSON responses.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'fios-api',
            },
          },
          {
            // Cache diagram vendor on first use (not in precache — too large).
            urlPattern: ({ url }) => /vendor-diagrams-.*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fios-diagrams',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        /**
         * Split heavy study-suite deps so the main entry stays under Workbox's
         * default precache budget and browsers cache them independently.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // Mermaid pulls elk/cytoscape — huge; keep isolated + out of SW precache.
          if (
            id.includes('mermaid') ||
            id.includes('@mermaid-js') ||
            id.includes('/elkjs') ||
            id.includes('cytoscape') ||
            id.includes('/dagre') ||
            id.includes('khroma')
          ) {
            return 'vendor-diagrams'
          }
          if (id.includes('katex')) {
            return 'vendor-katex'
          }
          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
            return 'vendor-monaco'
          }
          if (id.includes('pdfjs-dist')) {
            return 'vendor-pdf'
          }
          if (id.includes('react-syntax-highlighter') || id.includes('refractor') || id.includes('highlight.js')) {
            return 'vendor-highlight'
          }
          if (id.includes('react-markdown') || id.includes('remark-') || id.includes('rehype-') || id.includes('mdast') || id.includes('unified') || id.includes('micromark')) {
            return 'vendor-markdown'
          }
          if (id.includes('framer-motion')) {
            return 'vendor-motion'
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase'
          }
          return undefined
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
