// e2e/ios-pwa.spec.ts — 2.6 (C-07): מטא-תגי iOS + אייקון, ורמז ההתקנה מוסתר
// בכרום (לא-iOS), בלי לחסום את "הלחיצה הראשונה מדברת".

import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test('index.html כולל apple-touch-icon ומטא web-app ל-iOS', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(
    page.locator('meta[name="apple-mobile-web-app-capable"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('meta[name="apple-mobile-web-app-status-bar-style"]'),
  ).toHaveCount(1);
});

test('רמז ההתקנה ל-iOS אינו מוצג בכרום (לא-iOS), והלחיצה הראשונה עדיין מדברת', async ({
  page,
}) => {
  await page.goto('/');
  await dismissOnboarding(page);

  // דפדפן ה-e2e הוא chromium (לא-iOS) → הבאנר לעולם לא אמור להיטען.
  await expect(page.getByTestId('ios-install-hint')).toHaveCount(0);

  // "לחיצה ראשונה מדברת" — הלוח פעיל ולחיצה על תא מוסיפה למשפט (לא נחסם ע"י הרמז).
  const cell = page.getByRole('button', { name: 'אני', exact: true });
  await expect(cell).toBeVisible();
  await cell.click();
  await expect(page.getByTestId('sentence-text')).toContainText('אני');
});
