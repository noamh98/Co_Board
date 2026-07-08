// e2e/lock-unlock.spec.ts — שחרור/נעילה בלחיצה-ארוכה (Phase 3.1, smoke flow #2).

import { test, expect } from '@playwright/test';
import { dismissOnboarding, unlockViaLongPress } from './helpers';

test('לחיצה ארוכה משחררת למצב עריכה, נעילה חוזרת ללוח הילד', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await expect(page.getByRole('button', { name: 'אני', exact: true })).toBeVisible();

  // לחיצה קצרה — לא אמורה לשחרר.
  const lock = page.locator('button[aria-label^="שחרור למצב עריכה"]');
  await lock.focus();
  await page.keyboard.down('Enter');
  await page.waitForTimeout(200);
  await page.keyboard.up('Enter');
  await expect(page.locator('section[aria-label="ספריית לוחות"]')).toBeHidden();

  // לחיצה ארוכה — משחררת לספריית הלוחות (הבית של המבוגר).
  await unlockViaLongPress(page);
  await expect(page.locator('section[aria-label="ספריית לוחות"]')).toBeVisible();

  // נעילה חוזרת ללוח הילד.
  await page.getByRole('button', { name: 'נעילה — חזרה למצב משתמש' }).click();
  await expect(page.locator('button[aria-label^="שחרור למצב עריכה"]')).toBeVisible();
  await expect(page.locator('section[aria-label="ספריית לוחות"]')).toBeHidden();
});
