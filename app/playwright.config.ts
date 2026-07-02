// playwright.config.ts — e2e smoke suite (Phase 3.1). Runs against a production
// build served by `vite preview`, with the Firebase key stripped (same convention
// as vitest.config's `test.env` — auth gate off, offline-first child flows exercised).

import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// כלי הרצה מרוחקים/local-dev containers עשויים לחפוף Chromium מותקן-מראש שאינו
// תואם לגרסת @playwright/test המותקנת (revision mismatch) — אם קיים, נשתמש בו
// ישירות במקום ב-Chromium המנוהל של Playwright. ב-CI רגיל (ללא נתיב זה) — ברירת
// המחדל של Playwright חלה, ומצריכה `npx playwright install --with-deps chromium`.
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium';
const executablePath = existsSync(LOCAL_CHROMIUM) ? LOCAL_CHROMIUM : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_FIREBASE_API_KEY: '' },
  },
});
