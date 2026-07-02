// e2e/library-navigation.spec.ts — ספרייה → פתיחת לוח → ניווט (Phase 3.1, smoke flow #3).

import { test, expect } from '@playwright/test';
import { unlockViaLongPress } from './helpers';

test('פתיחת לוח מהספרייה מציגה אותו, וניווט "בית" חוזר ללוח הבית', async ({ page }) => {
  await page.goto('/');
  await unlockViaLongPress(page);

  const library = page.locator('section[aria-label="ספריית לוחות"]');
  await expect(library).toBeVisible();

  // פותחים את הלוח הראשון ברשימה (כרטיס board-card__open כלשהו).
  const firstBoardCard = library.locator('.board-card__open').first();
  await firstBoardCard.click();

  // יצאנו מהספרייה לתצוגת לוח — סרגל הניווט (בית/קטגוריות/חזור) גלוי.
  const navHome = page.getByRole('button', { name: 'בית', exact: true });
  await expect(navHome).toBeVisible();
  await expect(library).toBeHidden();

  // "בית" מחזיר ללוח הבית של הפרופיל.
  await navHome.click();
  await expect(page.getByRole('button', { name: 'אני', exact: true })).toBeVisible();
});
