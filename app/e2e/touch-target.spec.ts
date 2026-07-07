// e2e/touch-target.spec.ts — רגרסיית C-04: יעד המגע של תא AAC בטלפון.
// לפני התיקון ה-media query דרס min-height ל-44px קבוע (מתחת לרצפת WCAG AA).
// כעת הוא נגזר מ-cellMinPx (--cell-min) עם רצפת 48px — הבדיקה נכשלת אם חוזרים ל-44px.

import { test, expect } from '@playwright/test';

test('C-04: גובה תא במסך טלפון נשאר ≥ רצפת WCAG AA (48px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto('/');

  const cell = page.getByRole('button', { name: 'אני', exact: true });
  await expect(cell).toBeVisible();

  const minHeight = await cell.evaluate((el) =>
    parseFloat(getComputedStyle(el).minHeight),
  );
  expect(minHeight).toBeGreaterThanOrEqual(48);

  const box = await cell.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(48);
});
