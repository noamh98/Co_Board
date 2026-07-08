// domain/deepLink.test.ts — בדיקות ל-parser קישור-העומק של הזמנת גישה (B-07).
import { describe, it, expect } from 'vitest';
import {
  parseInviteDeepLink,
  buildInviteLink,
  INVITE_PATH_PREFIX,
} from './deepLink';

const VALID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'; // 32 תווי hex תקינים

describe('domain/deepLink — parseInviteDeepLink (B-07)', () => {
  it('מזהה נתיב /invite/<code> תקין', () => {
    expect(parseInviteDeepLink(`/invite/${VALID}`)).toEqual({
      kind: 'invite',
      code: VALID,
    });
  });

  it('מנרמל קוד באותיות גדולות לאותיות קטנות', () => {
    const res = parseInviteDeepLink(`/invite/${VALID.toUpperCase()}`);
    expect(res).toEqual({ kind: 'invite', code: VALID });
  });

  it('מתעלם מ-/ נגרר בסוף הנתיב', () => {
    expect(parseInviteDeepLink(`/invite/${VALID}/`)).toEqual({
      kind: 'invite',
      code: VALID,
    });
  });

  it('מתעלם מ-hash אחרי הקוד', () => {
    expect(parseInviteDeepLink(`/invite/${VALID}#x`)).toEqual({
      kind: 'invite',
      code: VALID,
    });
  });

  it('מזהה קידומת /invite/ ברישיות מעורבת', () => {
    expect(parseInviteDeepLink(`/Invite/${VALID}`)).toEqual({
      kind: 'invite',
      code: VALID,
    });
  });

  it('תומך בצורת שאילתה ?invite=<code>', () => {
    expect(parseInviteDeepLink('/', `?invite=${VALID}`)).toEqual({
      kind: 'invite',
      code: VALID,
    });
  });

  it('מוצא invite בין פרמטרים אחרים בשאילתה', () => {
    expect(parseInviteDeepLink('/', `?foo=1&invite=${VALID}&bar=2`)).toEqual({
      kind: 'invite',
      code: VALID,
    });
  });

  it('נתיב גובר על שאילתה כשקיימים שניהם', () => {
    const other = 'ffffffffffffffffffffffffffffffff';
    expect(parseInviteDeepLink(`/invite/${VALID}`, `?invite=${other}`)).toEqual({
      kind: 'invite',
      code: VALID,
    });
  });

  it('מפענח קידוד URL של הקוד', () => {
    expect(parseInviteDeepLink('/', `?invite=${encodeURIComponent(VALID)}`)).toEqual({
      kind: 'invite',
      code: VALID,
    });
  });

  it('מחזיר null לקוד קצר מדי', () => {
    expect(parseInviteDeepLink('/invite/a1b2c3')).toBeNull();
  });

  it('מחזיר null לקוד עם תווים שאינם hex', () => {
    const bad = 'z1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
    expect(parseInviteDeepLink(`/invite/${bad}`)).toBeNull();
  });

  it('מחזיר null לנתיב ללא קטע קוד', () => {
    expect(parseInviteDeepLink('/invite/')).toBeNull();
  });

  it('מחזיר null לנתיב לא רלוונטי', () => {
    expect(parseInviteDeepLink('/settings')).toBeNull();
  });

  it('מחזיר null לקלט ריק', () => {
    expect(parseInviteDeepLink('/')).toBeNull();
    expect(parseInviteDeepLink('', '')).toBeNull();
  });
});

describe('domain/deepLink — buildInviteLink (B-07)', () => {
  it('בונה קישור מלא <origin>/invite/<code>', () => {
    expect(buildInviteLink('https://co.board', VALID)).toBe(
      `https://co.board${INVITE_PATH_PREFIX}${VALID}`,
    );
  });

  it('מסיר / נגרר מ-origin', () => {
    expect(buildInviteLink('https://co.board/', VALID)).toBe(
      `https://co.board/invite/${VALID}`,
    );
  });

  it('מנרמל את הקוד לאותיות קטנות', () => {
    expect(buildInviteLink('https://co.board', VALID.toUpperCase())).toBe(
      `https://co.board/invite/${VALID}`,
    );
  });

  it('round-trip: parse(build(code)) מחזיר את הקוד', () => {
    const link = buildInviteLink('https://co.board', VALID);
    const path = link.replace('https://co.board', '');
    expect(parseInviteDeepLink(path)).toEqual({ kind: 'invite', code: VALID });
  });
});
