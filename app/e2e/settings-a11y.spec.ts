// e2e/settings-a11y.spec.ts — פאנל הגדרות + סריקת נגישות axe (Phase 3.1, smoke flow #4).
//
// KNOWN-ISSUES (תועד ב-HANDOFF §7, לא תוקן כאן — ראה נימוק שם):
//  - color-contrast: --cl-primary (הכתום-קורל של המותג, presentation/ui/tokens.css)
//    לא עומד ב-4.5:1 מול טקסט לבן על כפתורים/badges — שינוי טוקן צבע הוא החלטת
//    מיתוג רוחבת-אפליקציה, לא באג נקודתי; דורש אישור מוצר/עיצוב.
//  - aria-required-parent/children: .board .cell עם role="gridcell" בלי role="row"
//    עוטף (BoardView.tsx — מיקום כל תא לפי grid-area ישירות, לא לפי סדר שורות ב-DOM;
//    עטיפת row תשבור את מיקום ה-CSS grid). דורש שדרוג מבנה ה-DOM של הלוח, לא תיקון קטן.
// שני אלה מנוטרלים מפורשות כדי שה-gate ימשיך לתפוס רגרסיות a11y *חדשות*.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { unlockViaLongPress } from './helpers';

const KNOWN_PRE_EXISTING_RULES = ['color-contrast', 'aria-required-parent', 'aria-required-children'];

test('פאנל הגדרות נפתח ונסגר, וללא הפרות axe קריטיות/רציניות חדשות', async ({ page }) => {
  await page.goto('/');
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
  await expect(page.getByRole('button', { name: 'אני', exact: true })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .disableRules(KNOWN_PRE_EXISTING_RULES)
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
