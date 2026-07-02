import { describe, it, expect } from 'vitest';
import { assertValidBackup, isValidBoardRecord, isValidProfileRecord } from './backupValidation';

const validEnvelope = {
  backupFormat: 1,
  exportedAt: 12345,
  deviceId: 'dev-1',
  boards: [],
  profiles: [],
  settings: {},
};

describe('assertValidBackup (3.5, CR-E)', () => {
  it('לא זורק על מעטפה תקינה', () => {
    expect(() => assertValidBackup(validEnvelope)).not.toThrow();
  });

  it('זורק על קלט שאינו object', () => {
    expect(() => assertValidBackup('not-an-object')).toThrow('קובץ הגיבוי אינו תקין');
    expect(() => assertValidBackup(null)).toThrow('קובץ הגיבוי אינו תקין');
    expect(() => assertValidBackup([1, 2, 3])).toThrow('קובץ הגיבוי אינו תקין');
  });

  it('זורק על backupFormat שגוי', () => {
    expect(() => assertValidBackup({ ...validEnvelope, backupFormat: 2 })).toThrow(
      'פורמט הגיבוי אינו נתמך',
    );
  });

  it('זורק כשחסר exportedAt/deviceId', () => {
    expect(() =>
      assertValidBackup({ ...validEnvelope, exportedAt: 'not-a-number' }),
    ).toThrow('תאריך ייצוא');
    expect(() => assertValidBackup({ ...validEnvelope, deviceId: 42 })).toThrow(
      'מזהה מכשיר',
    );
  });

  it('זורק כש-boards/profiles אינם מערך', () => {
    expect(() => assertValidBackup({ ...validEnvelope, boards: 'x' })).toThrow(
      'boards',
    );
    expect(() => assertValidBackup({ ...validEnvelope, profiles: 'x' })).toThrow(
      'profiles',
    );
  });

  it('זורק כש-settings אינו object', () => {
    expect(() => assertValidBackup({ ...validEnvelope, settings: [] })).toThrow(
      'settings',
    );
  });
});

describe('isValidBoardRecord / isValidProfileRecord (3.5)', () => {
  it('מקבל רשומת board תקינה ודוחה רשומה פגומה', () => {
    expect(isValidBoardRecord({ id: 'b1', grid: { rows: 4, cols: 4 } })).toBe(true);
    expect(isValidBoardRecord({ id: 'b1' })).toBe(false);
    expect(isValidBoardRecord({ grid: {} })).toBe(false);
    expect(isValidBoardRecord(null)).toBe(false);
    expect(isValidBoardRecord('x')).toBe(false);
  });

  it('מקבל רשומת profile תקינה ודוחה רשומה פגומה', () => {
    expect(isValidProfileRecord({ id: 'p1', homeBoardId: 'b1' })).toBe(true);
    expect(isValidProfileRecord({ id: 'p1' })).toBe(false);
    expect(isValidProfileRecord(null)).toBe(false);
  });
});
