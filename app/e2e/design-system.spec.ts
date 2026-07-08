// e2e/design-system.spec.ts — מערכת עיצוב v1 (Phase 2 task 2.3).
//
// שתי בדיקות:
//  1) פרטיות (D-11): אין <link> לגופני Google (fonts.googleapis / fonts.gstatic).
//     האפליקציה נטענת ללא בקשת רשת לצד-שלישי לפני הסכמה — גופנים מ-system stack.
//  2) ערכות נושא (C-18 גופן קריא, C-06 רגיעה חושית): הטוגלים בהגדרות
//     מחילים/מסירים class על <html>.

import { test, expect } from '@playwright/test';
import { dismissOnboarding, unlockViaLongPress } from './helpers';

test('D-11: אין בקשת גופנים לצד-שלישי (Google Fonts)', async ({ page }) => {
  await page.goto('/');
  // אין תגי link לדומיינים של Google Fonts ב-DOM.
  await expect(page.locator('link[href*="fonts.googleapis.com"]')).toHaveCount(0);
  await expect(page.locator('link[href*="fonts.gstatic.com"]')).toHaveCount(0);
});

test('C-18/C-06: טוגלים מחילים ערכות reading-font / sensory-calm על <html>', async ({ page }) => {
  const html = page.locator('html');

  await page.goto('/');
  await dismissOnboarding(page);
  await unlockViaLongPress(page);
  await page.getByRole('button', { name: 'הגדרות' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // גופן קריא (C-18)
  await expect(html).not.toHaveClass(/reading-font/);
  await page.locator('label[for="reading-font"]').click();
  await expect(html).toHaveClass(/reading-font/);

  // רגיעה חושית (C-06)
  await expect(html).not.toHaveClass(/sensory-calm/);
  await page.locator('label[for="sensory-calm"]').click();
  await expect(html).toHaveClass(/sensory-calm/);

  // כיבוי מחזיר את המצב.
  await page.locator('label[for="reading-font"]').click();
  await expect(html).not.toHaveClass(/reading-font/);
});
