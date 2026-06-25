import { describe, it, expect } from 'vitest';
import {
  stripNiqqud,
  addDefiniteArticle,
  addPrefix,
  pluralizeNoun,
  conjugatePresent,
  inflectNoun,
  inflectWord,
} from './hebrewMorphology';

describe('hebrewMorphology — I1', () => {
  it('stripNiqqud מסיר סימני ניקוד', () => {
    expect(stripNiqqud('שָׁלוֹם')).toBe('שלום');
  });

  it('ריבוי רגיל: זכר +ים, נקבה ב-ה → ות', () => {
    expect(pluralizeNoun('ספר', 'm')).toBe('ספרים');
    expect(pluralizeNoun('ילדה', 'f')).toBe('ילדות');
  });

  it('ריבוי חריג', () => {
    expect(pluralizeNoun('איש')).toBe('אנשים');
    expect(pluralizeNoun('אישה')).toBe('נשים');
    expect(pluralizeNoun('יום')).toBe('ימים');
  });

  it('יידוע ותחיליות', () => {
    expect(addDefiniteArticle('ילד')).toBe('הילד');
    expect(addDefiniteArticle('הילד')).toBe('הילד'); // לא מכפיל
    expect(addPrefix('בית', 'ב')).toBe('בבית');
    expect(addPrefix('בית', 'x')).toBe('בית'); // תחילית לא חוקית
  });

  it('הטיית בינוני — שלמים', () => {
    expect(conjugatePresent('אוכל', { gender: 'm', number: 'singular' })).toBe('אוכל');
    expect(conjugatePresent('אוכל', { gender: 'f', number: 'singular' })).toBe('אוכלת');
    expect(conjugatePresent('אוכל', { gender: 'm', number: 'plural' })).toBe('אוכלים');
    expect(conjugatePresent('אוכל', { gender: 'f', number: 'plural' })).toBe('אוכלות');
  });

  it('הטיית בינוני — ל"ה וחריגים', () => {
    expect(conjugatePresent('רוצה', { gender: 'f', number: 'singular' })).toBe('רוצה');
    expect(conjugatePresent('רוצה', { gender: 'm', number: 'plural' })).toBe('רוצים');
    expect(conjugatePresent('רוצה', { gender: 'f', number: 'plural' })).toBe('רוצות');
  });

  it('inflectNoun משלב מספר + יידוע', () => {
    expect(inflectNoun('ילד', { number: 'plural', definite: true })).toBe('הילדים');
  });

  it('inflectWord מנתב לפי POS', () => {
    expect(inflectWord('אוכל', { pos: 'verb' }, { gender: 'f' })).toBe('אוכלת');
    expect(inflectWord('ספר', { pos: 'noun' }, { number: 'plural' })).toBe('ספרים');
    expect(inflectWord('מהר', { pos: 'adverb' }, { number: 'plural' })).toBe('מהר');
  });
});
