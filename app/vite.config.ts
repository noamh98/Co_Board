import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Offline-first הוא אינווריאנט (HANDOFF §4): ה-PWA חייב לעבוד ללא רשת.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'לוח תקשורת',
        short_name: 'לוח תקשורת',
        description: 'אפליקציית AAC עברית — תקשורת תומכת וחליפית',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#1F7A5C',
        background_color: '#ECF2FA',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // E3: לא לכלול את ספריית הסמלים ב-precache (אלפי PNG → precache ענק).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/symbols/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // הסמלים נשמרים ב-runtime לפי דרישה (CacheFirst) — offline אחרי השימוש הראשון.
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.includes('/symbols/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'arasaac-symbols',
              expiration: {
                maxEntries: 3000,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
});
