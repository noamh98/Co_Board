import { describe, it, expect } from 'vitest';
import {
  createNavStack,
  navPush,
  navPop,
  navHome,
  navCurrent,
  navCanGoBack,
} from './navigationStack';

const HOME = 'board-home';
const FOOD = 'board-food';
const PLAY = 'board-play';

describe('navigationStack — יחידה', () => {
  it('createNavStack: בית בתחתית, נוכחי=בית', () => {
    const s = createNavStack(HOME);
    expect(navCurrent(s)).toBe(HOME);
    expect(navCanGoBack(s)).toBe(false);
  });

  it('navPush: מוסיף לוח ומעדכן נוכחי', () => {
    const s = navPush(createNavStack(HOME), FOOD);
    expect(navCurrent(s)).toBe(FOOD);
    expect(navCanGoBack(s)).toBe(true);
  });

  it('navPop: חוזר ללוח הקודם', () => {
    const s = navPop(navPush(createNavStack(HOME), FOOD));
    expect(navCurrent(s)).toBe(HOME);
    expect(navCanGoBack(s)).toBe(false);
  });

  it('navPop בבית: נשאר בבית (לא קורס)', () => {
    const s = navPop(createNavStack(HOME));
    expect(navCurrent(s)).toBe(HOME);
  });

  it('navHome: קופץ ישירות לבית מכל עומק', () => {
    let s = createNavStack(HOME);
    s = navPush(s, FOOD);
    s = navPush(s, PLAY);
    s = navHome(HOME);
    expect(navCurrent(s)).toBe(HOME);
    expect(navCanGoBack(s)).toBe(false);
  });

  it('מניעת לולאה ישירה: דחיפת אותו לוח ברצף לא יוצרת כפל', () => {
    const s = navPush(createNavStack(HOME), HOME);
    expect(s.stack.length).toBe(1);
    expect(navCurrent(s)).toBe(HOME);
  });

  it('מניעת מבוי סתום: תמיד יש דרך חזרה לבית', () => {
    let s = createNavStack(HOME);
    s = navPush(s, FOOD);
    s = navPush(s, PLAY);
    // חזרה עד הבית תמיד אפשרית
    while (navCanGoBack(s)) s = navPop(s);
    expect(navCurrent(s)).toBe(HOME);
  });

  it('ניווט עמוק ← חזרה מרובה', () => {
    const boards = ['b1', 'b2', 'b3', 'b4'];
    let s = createNavStack(HOME);
    for (const b of boards) s = navPush(s, b);
    expect(navCurrent(s)).toBe('b4');
    for (const b of [...boards].reverse()) {
      expect(navCurrent(s)).toBe(b);
      s = navPop(s);
    }
    expect(navCurrent(s)).toBe(HOME);
  });
});
