// e2e/onboarding.spec.ts — הדרכת פתיחה (Phase 2 task 2.4, C-05/C-10).
//
// שתי דרישות ה-DoD:
//  1) ההדרכה ניתנת לדילוג, ו"לחיצה ראשונה תמיד מדברת" אינה נחסמת על ידה — לאחר
//     דילוג מיידי, לחיצה על תא מוסיפה מילה למשפט (הקראה). ההעדפה נשמרת (לא חוזרת).
//  2) מסלול הפרסונה + סיור 3 המסכים מסתיים וסוגר את ההדרכה.

import { test, expect } from '@playwright/test';

test('ההדרכה מופיעה, ניתנת לדילוג, ולחיצה ראשונה מדברת — ואינה חוזרת אחרי רענון', async ({
  page,
}) => {
  await page.goto('/');

  const onboarding = page.getByTestId('onboarding');
  await expect(onboarding).toBeVisible();

  // דילוג מיידי (פעולה אחת).
  await page.getByTestId('onboarding-skip').click();
  await expect(onboarding).toBeHidden();

  // "לחיצה ראשונה מדברת" — התא הראשון מוסיף למשפט, ללא חסימה מההדרכה.
  const cell = page.getByRole('button', { name: 'אני', exact: true });
  await expect(cell).toBeVisible();
  await cell.click();
  await expect(page.getByTestId('sentence-text')).toContainText('אני');

  // נשמר: רענון אינו מציג שוב את ההדרכה.
  await page.reload();
  await expect(page.getByRole('button', { name: 'אני', exact: true })).toBeVisible();
  await expect(page.getByTestId('onboarding')).toBeHidden();
});

test('בחירת פרסונה + סיור 3 מסכים (+ תזכורת קוד) מסתיים וסוגר את ההדרכה', async ({ page }) => {
  await page.goto('/');

  const onboarding = page.getByTestId('onboarding');
  await expect(onboarding).toBeVisible();

  // בחירת פרסונה מקדמת לסיור.
  await page.getByTestId('onboarding-persona-family').click();

  // מתקדמים דרך מסכי הסיור (ואם מוצג — שלב תזכורת הקוד) עד סגירה.
  for (let i = 0; i < 6; i += 1) {
    if (!(await onboarding.isVisible())) break;
    const next = page.getByTestId('onboarding-next');
    const pinLater = page.getByTestId('onboarding-pin-later');
    if (await next.isVisible().catch(() => false)) {
      await next.click();
    } else if (await pinLater.isVisible().catch(() => false)) {
      await pinLater.click();
    } else {
      break;
    }
  }

  await expect(onboarding).toBeHidden();
  // מגיעים ללוח הילד.
  await expect(page.getByRole('button', { name: 'אני', exact: true })).toBeVisible();
});
