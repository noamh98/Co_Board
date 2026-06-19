import { describe, it, expect } from 'vitest';
import {
  verifyPin,
  canEdit,
  canManageProfiles,
  ADULT_ROLE,
  DEFAULT_PIN,
} from './access';

describe('access — RBAC ושער קוד מטפל', () => {
  it('canEdit נגזר מ-ROLE_CAN_EDIT', () => {
    expect(canEdit('child')).toBe(false);
    expect(canEdit('staff')).toBe(false);
    expect(canEdit('parent')).toBe(true);
    expect(canEdit('clinician')).toBe(true);
    expect(canEdit(ADULT_ROLE)).toBe(true);
  });

  it('ניהול פרופילים זמין רק במצב מבוגר', () => {
    expect(canManageProfiles('locked')).toBe(false);
    expect(canManageProfiles('adult')).toBe(true);
  });

  it('verifyPin: תואם בלבד; קלט/קוד ריקים נדחים תמיד', () => {
    expect(verifyPin(DEFAULT_PIN, DEFAULT_PIN)).toBe(true);
    expect(verifyPin(' 1234 ', '1234')).toBe(true); // trim
    expect(verifyPin('0000', '1234')).toBe(false);
    expect(verifyPin('', '1234')).toBe(false);
    expect(verifyPin('1234', '')).toBe(false);
  });
});
