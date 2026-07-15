import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'masked-icon.svg',
        'eduket.png',
      ],

      manifest: {
        name: 'Eduket OS',
        short_name: 'Eduket',
        description: 'AI-powered school assessment platform',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        runtimeCaching: [

          // ALL cross-origin requests (Firebase, Groq, PayFast, Render backend)
          // NetworkOnly prevents opaque-response clone errors and POST body issues
          {
            urlPattern: ({ url }) => url.origin !== self.location.origin,
            handler: 'NetworkOnly',
          },

          // SPA shell — NetworkFirst with 10s timeout (5s was too tight for Render cold starts)
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 10,
            },
          },

          // JS / CSS / workers — StaleWhileRevalidate (safe: Vite content-hashes filenames)
          {
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'asset-cache',
            },
          },

          // Images — CacheFirst, max 100 entries, 30 day expiry
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },

        ],
      },
    }),
  ],

  // Forces single React instance — prevents virtual:pwa-register pulling
  // in a second copy that causes useState to be null at boot
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },

  // Required for Netlify SPA routing
  base: '/',

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': [
            'firebase/app', 'firebase/auth',
            'firebase/firestore', 'firebase/storage',
          ],
        },
      },
    },
  },

});