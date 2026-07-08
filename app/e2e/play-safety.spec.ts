// e2e/play-safety.spec.ts — בטיחות מצב-משחק (C-09): אישור-לפני-ניקוי + אינווריאנט
// "לחיצה ראשונה מדברת". חלק ב' (haptics) מכוסה ב-unit (navigator.vibrate לא זמין ב-CI).

import { test, expect, type Page } from '@playwright/test';
import { dismissOnboarding, unlockViaLongPress } from './helpers';

async function addTwoWords(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'אני', exact: true }).click();
  await page.getByRole('button', { name: 'רוצה', exact: true }).click();
  await expect(page.getByTestId('sentence-text')).toContainText('רוצה');
}

test('C-09: אישור-לפני-ניקוי מופיע כברירת-מחדל ומנקה רק לאחר אישור', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await addTwoWords(page);

  await page.getByRole('button', { name: 'ניקוי כל המשפט' }).click();

  // דיאלוג אישור מופיע — המשפט עדיין קיים (אין ניקוי בשוגג).
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('sentence-text')).toContainText('אני');

  await page.getByRole('button', { name: 'נקה' }).click();
  await expect(page.getByTestId('sentence-text')).toHaveText('');
});

test('C-09: ביטול אישור-הניקוי משאיר את המשפט', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await addTwoWords(page);

  await page.getByRole('button', { name: 'ניקוי כל המשפט' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'ביטול' }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('sentence-text')).toContainText('אני');
});

test('C-09: כשההגדרה כבויה — ניקוי מיידי ללא דיאלוג', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);

  // כניסת מבוגר → הגדרות → כיבוי "אישור לפני ניקוי".
  await unlockViaLongPress(page);
  await page.getByRole('button', { name: 'הגדרות' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#confirm-before-clear').uncheck({ force: true });
  await page.getByRole('button', { name: 'סגור' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // חזרה למצב ילד (נעילה) — הלוח מוצג עם התאים.
  await page.getByRole('button', { name: 'נעילה — חזרה למצב משתמש' }).click();
  await addTwoWords(page);

  await page.getByRole('button', { name: 'ניקוי כל המשפט' }).click();
  // ניקוי מיידי, ללא דיאלוג.
  await expect(page.getByTestId('sentence-text')).toHaveText('');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('אינווריאנט: לחיצה ראשונה תמיד מדברת — הוספה מיידית ללא חסימה', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);

  // ללא כל אישור/חסימה — לחיצה ראשונה על תא מוסיפה מיד לשורת המשפט.
  await page.getByRole('button', { name: 'אני', exact: true }).click();
  await expect(page.getByTestId('sentence-text')).toContainText('אני');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
