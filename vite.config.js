import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// We wrap the config in a function to access the 'mode' variable
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      VitePWA({
        // ✅ This line fixes the 'preamble' error by disabling PWA in dev mode
        disable: mode === 'development', 
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon-96x96.png',
          'favicon.svg',
          'apple-touch-icon.png'
        ],
        manifest: {
          name: 'EduPlanet CAT Exams',
          short_name: 'EduPlanet CAT',
          description: 'Track your CAT exam results and performance.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'document',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
              },
            },
          ],
        },
      }),
    ],
  };
});