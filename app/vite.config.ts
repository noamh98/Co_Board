import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Offline-first הוא אינווריאנט (HANDOFF §4): ה-PWA חייב לעבוד ללא רשת.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'לוח תקשורת',
        short_name: 'לוח תקשורת',
        description: 'אפליקציית AAC עברית — תקשורת תומכת וחליפית',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#E8694C',
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
    // Firebase keys must not reach test code — auth gate would block all tests.
    env: { VITE_FIREBASE_API_KEY: '' },
    // 3.1: e2e/*.spec.ts משתמשים ב-@playwright/test, לא בריצת vitest — להוציא
    // מהגילוי הרגיל (אחרת ה-glob הדיפולטיבי של vitest ('*.spec.ts' כלול) יתנגש).
    // רשימת ברירת-המחדל של vitest משוכפלת כאן במפורש כי exclude דורס אותה, לא מוסיף לה.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/e2e/**',
    ],
    // 3.6: דוח כיסוי ב-CI — ללא סף שנכשל (בלתי-חוסם, למעקב מגמה בלבד).
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.config.ts', 'e2e/**'],
    },
  },
});
