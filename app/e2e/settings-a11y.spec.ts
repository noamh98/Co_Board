// e2e/settings-a11y.spec.ts — פאנל הגדרות + סריקת נגישות axe (Phase 3.1, smoke flow #4).
//
// color-contrast נאכף כעת גלובלית: אין יותר waiver. לאחר כיול ערכי הטוקנים
// בערכת :root (presentation/ui/tokens.css) ל-≥4.5:1, כל צירוף טקסט/רקע עומד
// ב-WCAG 1.4.3, ולכן KNOWN_PRE_EXISTING_RULES ריק ואינו מנטרל אף כלל.
//
// שודרג ב-Phase 2 task 2.2 (C-03/B-22): aria-required-parent ו-aria-required-children
// כבר אינם מנוטרלים — BoardView עוטף כעת את התאים ב-role="row" (grid > row > gridcell),
// כך שהיררכיית ה-ARIA של הלוח תקינה והסריקה ירוקה בלי הפרות אלה.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { dismissOnboarding, unlockViaLongPress } from './helpers';

const KNOWN_PRE_EXISTING_RULES: string[] = [];

test('פאנל הגדרות נפתח ונסגר, וללא הפרות axe קריטיות/רציניות חדשות', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await unlockViaLongPress(page);

  await page.getByRole('button', { name: 'הגדרות' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#s-manage')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('.settings-panel')
    .disableRules(KNOWN_PRE_EXISTING_RULES)
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);

  await page.getByRole('button', { name: 'סגור' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('לוח הילד ללא הפרות axe קריטיות/רציניות חדשות', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await expect(page.getByRole('button', { name: 'אני', exact: true })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .disableRules(KNOWN_PRE_EXISTING_RULES)
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
