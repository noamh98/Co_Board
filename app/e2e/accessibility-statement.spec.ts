// e2e/accessibility-statement.spec.ts — הצהרת נגישות v1 (Phase 2 task 2.10, C-17).
//
// מוודא שסקשן "הצהרת נגישות" מוצג בפאנל ההגדרות עם רמת ההתאמה החלקית
// והמגבלה הידועה (color-contrast), ומריץ סריקת axe על הסקשן.
// כלל color-contrast מנוטרל במפורש — זו בדיוק המגבלה הידועה שההצהרה מצהירה עליה.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { dismissOnboarding, unlockViaLongPress } from './helpers';

const KNOWN_PRE_EXISTING_RULES = ['color-contrast'];

test('הצהרת הנגישות מוצגת בפאנל ההגדרות עם רמת התאמה חלקית ומגבלה ידועה', async ({
  page,
}) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await unlockViaLongPress(page);

  await page.getByRole('button', { name: 'הגדרות' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const heading = page.locator('#s-accessibility');
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText('הצהרת נגישות');

  const section = page.locator('section[aria-labelledby="s-accessibility"]');
  await expect(section).toContainText('התאמה חלקית');
  await expect(section).toContainText('ת"י 5568');
  await expect(section).toContainText('מגבלה ידועה');

  const results = await new AxeBuilder({ page })
    .include('section[aria-labelledby="s-accessibility"]')
    .disableRules(KNOWN_PRE_EXISTING_RULES)
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
