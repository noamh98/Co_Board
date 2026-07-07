import { describe, it, expect } from 'vitest';
import {
  SHARE_CODE_LENGTH,
  normalizeShareCode,
  sanitizeShareCodeInput,
  isValidShareCode,
} from './shareCode';

describe('domain/shareCode (D-01)', () => {
  const VALID = 'abcdef0123456789abcdef0123456789'; // 32 hex

  it('אורך הקוד הוא 32 תווים', () => {
    expect(SHARE_CODE_LENGTH).toBe(32);
    expect(VALID).toHaveLength(32);
  });

  it('מזהה קוד hex תקין', () => {
    expect(isValidShareCode(VALID)).toBe(true);
  });

  it('מנרמל אותיות גדולות ורווחים לפני ולידציה', () => {
    expect(isValidShareCode('  ABCDEF0123456789ABCDEF0123456789  ')).toBe(true);
    expect(normalizeShareCode('AB CD\nEF')).toBe('abcdef');
  });

  it('דוחה קוד בן 6 ספרות (הפורמט הישן/השגוי)', () => {
    expect(isValidShareCode('123456')).toBe(false);
  });

  it('דוחה אורך שגוי ותווים לא-hex', () => {
    expect(isValidShareCode(VALID.slice(0, 31))).toBe(false);
    expect(isValidShareCode(VALID + 'a')).toBe(false);
    expect(isValidShareCode('g'.repeat(32))).toBe(false);
    expect(isValidShareCode('')).toBe(false);
  });

  it('sanitizeShareCodeInput מסנן תווים לא-hex וחותך ל-32', () => {
    expect(sanitizeShareCodeInput('AB-CD ef!!')).toBe('abcdef');
    expect(sanitizeShareCodeInput('z'.repeat(40))).toBe('');
    expect(sanitizeShareCodeInput(VALID + VALID)).toHaveLength(32);
  });
});
