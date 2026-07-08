// e2e/board.spec.ts — טעינת הלוח + לחיצת תא → הקראה (Phase 3.1, smoke flow #1).

import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test('הלוח נטען נעול, ולחיצת תא מוסיפה למשפט', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);

  await expect(
    page.locator('button[aria-label^="שחרור למצב עריכה"]'),
  ).toBeVisible();

  const cell = page.getByRole('button', { name: 'אני', exact: true });
  await expect(cell).toBeVisible();
  await cell.click();

  const sentence = page.getByTestId('sentence-text');
  await expect(sentence).toContainText('אני');

  await page.getByRole('button', { name: 'רוצה', exact: true }).click();
  await expect(sentence).toContainText('רוצה');

  await page.getByRole('button', { name: 'מחיקת המילה האחרונה' }).click();
  await expect(sentence).not.toContainText('רוצה');
  await expect(sentence).toContainText('אני');
});
