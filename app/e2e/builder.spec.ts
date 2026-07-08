// e2e/builder.spec.ts — פתיחת builder מההגדרות ויציאה (Phase 3.1, smoke flow #5).
// כיסוי פונקציונלי מעמיק של עריכת תאים כבר קיים ב-BuilderView.test.tsx (component-level);
// כאן רק הזרימה המלאה: אישור → הגדרות → ערוך לוח → builder נטען → חזרה ללוח הילד.

import { test, expect } from '@playwright/test';
import { dismissOnboarding, unlockViaLongPress } from './helpers';

test('"ערוך לוח" מההגדרות פותח את ה-builder, וחזרה יוצאת חזרה ללוח', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await unlockViaLongPress(page);

  await page.getByRole('button', { name: 'הגדרות' }).click();
  await page.getByRole('button', { name: 'ערוך לוח' }).click();

  await expect(page.getByRole('button', { name: 'חזור לתצוגת ילד' })).toBeVisible();

  await page.getByRole('button', { name: 'חזור לתצוגת ילד' }).click();
  await expect(page.getByRole('button', { name: 'חזור לתצוגת ילד' })).toBeHidden();
});
