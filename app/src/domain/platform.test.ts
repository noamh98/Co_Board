import { describe, it, expect } from 'vitest';
import {
  isIos,
  isSafari,
  isInStandaloneMode,
  shouldShowIosInstallHint,
} from './platform';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1';
const IPAD_SAFARI_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

describe('isIos', () => {
  it('מזהה iPhone', () => {
    expect(isIos(IPHONE_SAFARI)).toBe(true);
  });
  it('מזהה iPadOS 13+ שמתחזה ל-Mac עם מסך-מגע', () => {
    expect(isIos(IPAD_SAFARI_AS_MAC, 5)).toBe(true);
  });
  it('לא מזהה Mac ללא מסך-מגע כ-iOS', () => {
    expect(isIos(IPAD_SAFARI_AS_MAC, 0)).toBe(false);
  });
  it('לא מזהה Android/Desktop כ-iOS', () => {
    expect(isIos(ANDROID_CHROME)).toBe(false);
    expect(isIos(DESKTOP_CHROME)).toBe(false);
  });
});

describe('isSafari', () => {
  it('מזהה Safari אמיתי ב-iOS', () => {
    expect(isSafari(IPHONE_SAFARI)).toBe(true);
  });
  it('דוחה Chrome ל-iOS (CriOS)', () => {
    expect(isSafari(IPHONE_CHROME)).toBe(false);
  });
  it('דוחה דפדפן-בתוך-אפליקציה (FBAN)', () => {
    expect(isSafari(IPHONE_SAFARI + ' FBAN/x')).toBe(false);
  });
});

describe('isInStandaloneMode', () => {
  it('true כאשר display-mode standalone', () => {
    expect(isInStandaloneMode(true)).toBe(true);
  });
  it('true כאשר navigator.standalone (iOS)', () => {
    expect(isInStandaloneMode(false, true)).toBe(true);
  });
  it('false כאשר לא מותקנת', () => {
    expect(isInStandaloneMode(false, false)).toBe(false);
    expect(isInStandaloneMode(false)).toBe(false);
  });
});

describe('shouldShowIosInstallHint', () => {
  const base = {
    ua: IPHONE_SAFARI,
    displayModeStandalone: false,
    navigatorStandalone: false,
    dismissed: false,
  };
  it('מציג ב-iPhone Safari לא-מותקן שלא נסגר', () => {
    expect(shouldShowIosInstallHint(base)).toBe(true);
  });
  it('לא מציג אם המשתמש כבר סגר את הרמז', () => {
    expect(shouldShowIosInstallHint({ ...base, dismissed: true })).toBe(false);
  });
  it('לא מציג אם כבר מותקן (standalone)', () => {
    expect(
      shouldShowIosInstallHint({ ...base, displayModeStandalone: true }),
    ).toBe(false);
    expect(
      shouldShowIosInstallHint({ ...base, navigatorStandalone: true }),
    ).toBe(false);
  });
  it('לא מציג ב-Chrome ל-iOS', () => {
    expect(shouldShowIosInstallHint({ ...base, ua: IPHONE_CHROME })).toBe(false);
  });
  it('לא מציג ב-Android/Desktop', () => {
    expect(shouldShowIosInstallHint({ ...base, ua: ANDROID_CHROME })).toBe(false);
    expect(shouldShowIosInstallHint({ ...base, ua: DESKTOP_CHROME })).toBe(false);
  });
  it('מציג ב-iPad שמתחזה ל-Mac עם מסך-מגע', () => {
    expect(
      shouldShowIosInstallHint({ ...base, ua: IPAD_SAFARI_AS_MAC, maxTouchPoints: 5 }),
    ).toBe(true);
  });
});
