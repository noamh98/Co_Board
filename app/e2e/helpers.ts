// e2e/helpers.ts — עזרים משותפים לזרימות ה-smoke (Phase 3.1).

import type { Page } from '@playwright/test';

/**
 * שחרור למצב עריכה (MVP: לחיצה-ארוכה על המנעול, בלי PIN) — אותו דפוס כמו
 * unlockViaLongPress ב-App.test.tsx: keyDown Enter על המנעול, המתנה, keyUp.
 */
export async function unlockViaLongPress(page: Page): Promise<void> {
  const lock = page.locator('button[aria-label^="שחרור למצב עריכה"]');
  await lock.focus();
  await page.keyboard.down('Enter');
  await page.waitForTimeout(1300);
  await page.keyboard.up('Enter');
  await page.locator('section[aria-label="ספריית לוחות"]').waitFor({ state: 'visible' });
}
