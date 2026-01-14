import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Vite configuration with PWA auto-update + version injection
 * - Every git push → Netlify rebuild → new Service Worker
 * - App auto-refreshes to latest version
 * - App version comes from package.json (v1.0.1 → v1.0.2 → etc.)
 */
export default defineConfig(({ mode }) => ({
  /**
   * 🔖 Inject app version at build time
   * Accessible in JSX as __APP_VERSION__
   */
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },

  plugins: [
    react(),

    VitePWA({
      /**
       * 🔒 Disable PWA during development
       */
      disable: mode === "development",

      /**
       * 🔥 AUTO UPDATE MODE
       */
      registerType: "autoUpdate",

      /**
       * 📦 Static assets to include in precache
       */
      includeAssets: [
        "favicon.ico",
        "favicon-96x96.png",
        "favicon.svg",
        "apple-touch-icon.png",
        "icons/*.png",
      ],

      /**
       * 📱 Web App Manifest
       */
      manifest: {
        id: "/?source=pwa",
        name: "EduPlanet CAT Exams",
        short_name: "EduCAT",
        description: "Track your CAT exam results and performance.",
        theme_color: "#004aad",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/?source=pwa",
        scope: "/",

        /**
         * ⚠️ Force fresh assets on updates
         */
        update_via_cache: "none",

        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },

      /**
       * 🧠 SERVICE WORKER BEHAVIOUR
       */
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "worker",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "asset-cache",
            },
          },
        ],
      },
    }),
  ],

  /**
   * ✅ Required for Netlify + PWA routing
   */
  base: "/",
}));
