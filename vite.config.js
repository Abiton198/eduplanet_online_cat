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
          /**
           * 🚫 MUST BE FIRST — bypass all cross-origin requests entirely.
           *
           * Covers every external service this app talks to:
           *   - Render backend       (*.onrender.com)
           *   - Firebase Storage     (firebasestorage.googleapis.com)
           *   - Firestore            (firestore.googleapis.com)
           *   - Firebase Auth        (identitytoolkit.googleapis.com)
           *   - Firebase Auth tokens (securetoken.googleapis.com)
           *   - PayFast              (payfast.co.za)
           *   - Exchange rate API    (open.er-api.com)
           *
           * NetworkOnly calls fetch() directly — no caching, no timeout,
           * no opaque-response clone error, no undefined fallback.
           * This is what was causing "Failed to convert value to Response"
           * when POST /exams/upload timed out against the 5 s budget.
           */
          {
            urlPattern: ({ url }) => url.origin !== self.location.origin,
            handler: "NetworkOnly",
          },

          /**
           * 📄 Same-origin HTML (SPA shell — index.html).
           *
           * NetworkFirst so the app always tries to get the freshest shell.
           * Timeout raised to 10 s — 5 s was triggering on cold Render
           * starts and causing the fallback to return undefined.
           * Falls back to cache when genuinely offline.
           */
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 10,
            },
          },

          /**
           * ⚡ Same-origin static assets (JS bundles, CSS, worker scripts).
           *
           * StaleWhileRevalidate: serve cached instantly, refresh in bg.
           * Safe because Vite content-hashes every asset filename.
           */
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