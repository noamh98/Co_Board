// e2e/helpers.ts — עזרים משותפים לזרימות ה-smoke (Phase 3.1).

import type { Page } from '@playwright/test';

/**
 * 2.4 (C-05): דילוג על הדרכת הפתיחה אם היא מוצגת. סובלני — אם ההדרכה כבר הושלמה
 * (או לא הופיעה תוך פרק הזמן) הפונקציה פשוט חוזרת בלי להיכשל. נקראת מיד אחרי goto
 * כדי לא לחסום את שאר הזרימה.
 */
export async function dismissOnboarding(page: Page): Promise<void> {
  const onboarding = page.getByTestId('onboarding');
  try {
    await onboarding.waitFor({ state: 'visible', timeout: 8000 });
  } catch {
    return;
  }
  await page.getByTestId('onboarding-skip').click();
  await onboarding.waitFor({ state: 'hidden' });
}

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
