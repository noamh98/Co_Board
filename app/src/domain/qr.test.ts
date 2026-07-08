import { describe, it, expect } from 'vitest';
import {
  generateQr,
  rsEncode,
  formatInfoBits,
  isAlnumEncodable,
  QR_ALNUM_CHARSET,
} from './qr';

// מטריצת golden שנוצרה מהמימוש שאומת offline מול וקטורי ISO/format/roundtrip.
// כל שינוי לא-מכוון בלוגיקת הקידוד ישבור את ההשוואה הזו.
const GOLDEN_CODE = 'A1B2C3D4E5F60718293A4B5C6D7E8F90';
const GOLDEN = [
  '1111111011101000001111111',
  '1000001011100010101000001',
  '1011101010110011101011101',
  '1011101011010100101011101',
  '1011101000000011101011101',
  '1000001010011110101000001',
  '1111111010101010101111111',
  '0000000001001010000000000',
  '1100111000010010000101111',
  '1101100111101110111110000',
  '1011001000011010001001001',
  '1101110110110110010001001',
  '0001011100101101001100001',
  '1001010110000001011111010',
  '0001101110000011111100010',
  '0010110000001100111100010',
  '1100011001010100111111010',
  '0000000010101010100010011',
  '1111111000011100101011010',
  '1000001011110101100010110',
  '1011101010101110111110101',
  '1011101000100111000010111',
  '1011101000100001110101010',
  '1000001010101000000110111',
  '1111111011011110000101101',
];

function render(mods: readonly (readonly boolean[])[]): string[] {
  return mods.map((row) => row.map((b) => (b ? '1' : '0')).join(''));
}

describe('domain/qr — generateQr (C-12)', () => {
  it('מייצר את מטריצת ה-golden עבור קוד 32-hex גדול (v2, mask 4)', () => {
    const sym = generateQr(GOLDEN_CODE);
    expect(sym.version).toBe(2);
    expect(sym.size).toBe(25);
    expect(sym.mask).toBe(4);
    expect(render(sym.modules)).toEqual(GOLDEN);
  });

  it('גודל המטריצה עקבי (n×n, 17+4·version)', () => {
    const sym = generateQr('HELLO');
    expect(sym.modules).toHaveLength(sym.size);
    for (const row of sym.modules) expect(row).toHaveLength(sym.size);
    expect(sym.size).toBe(17 + 4 * sym.version);
  });

  it('בוחר גרסה מינימלית לפי אורך המטען', () => {
    expect(generateQr('AB').version).toBe(1); // מטען קצר → v1
    expect(generateQr(GOLDEN_CODE).version).toBe(2); // 32 תווים → v2
  });

  it('פינות ה-finder כהות (מסגרת 7×7)', () => {
    const { modules } = generateQr(GOLDEN_CODE);
    for (let i = 0; i < 7; i++) {
      expect(modules[0][i]).toBe(true);
      expect(modules[i][0]).toBe(true);
    }
    expect(modules[3][3]).toBe(true); // ליבת ה-finder
  });

  it('זורק על קלט לא-אלפאנומרי או ריק', () => {
    expect(() => generateQr('abc')).toThrow(); // אותיות קטנות אינן ב-charset
    expect(() => generateQr('')).toThrow();
  });
});

describe('domain/qr — isAlnumEncodable', () => {
  it('מקבל ספרות/אותיות-גדולות ודוחה אותיות-קטנות', () => {
    expect(isAlnumEncodable('0123456789ABCDEF')).toBe(true);
    expect(isAlnumEncodable('abc')).toBe(false);
    expect(isAlnumEncodable('')).toBe(false);
  });
  it('כל תו ב-charset ניתן לקידוד', () => {
    expect(isAlnumEncodable(QR_ALNUM_CHARSET)).toBe(true);
  });
});

describe('domain/qr — Reed-Solomon (ISO/IEC 18004 numeric vector)', () => {
  it('codewords של EC תואמים לדוגמת "01234567" v1-M', () => {
    const data = [0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11];
    const ec = rsEncode(data, 10);
    expect(ec).toEqual([0xa5, 0x24, 0xd4, 0xc1, 0xed, 0x36, 0xc7, 0x87, 0x2c, 0x55]);
  });
});

describe('domain/qr — format information (published table, EC level L)', () => {
  it('תואם לערכי הטבלה הרשמית עבור מסכות 0–7', () => {
    const expected = [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976];
    for (let mask = 0; mask < 8; mask++) {
      expect(formatInfoBits(0b01, mask)).toBe(expected[mask]);
    }
  });
});
