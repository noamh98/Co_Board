import type { Fitzgerald } from './models';

/**
 * מפתח פיצג'רלד המשודרג (Modified Fitzgerald) — PRD §6.3.
 * הצבעים *רכים ומעומעמים* בכוונה (PRD §6.1): הפחתת עומס חושי לילדים על הרצף.
 * הצמד `text` מבטיח ניגודיות מספקת (WCAG 2.1 AA) מול רקע הצבע.
 * הצבעים נעולים כקבועים — לא נערכים ע"י המשתמש (עקביות מנגנון פיצג'רלד).
 */
export const FITZGERALD: Readonly<
  Record<Fitzgerald, { bg: string; text: string; label: string }>
> = {
  pronoun:     { bg: '#f6e7a3', text: '#3a3320', label: 'אנשים / כינויי גוף' },
  verb:        { bg: '#b7e0b7', text: '#1f3a1f', label: 'פעלים' },
  noun:        { bg: '#f8d2a6', text: '#3d2a14', label: 'שמות עצם' },
  adjective:   { bg: '#aecbe8', text: '#1b2f44', label: 'תארים' },
  preposition: { bg: '#e6c2dd', text: '#3a2336', label: 'מילות יחס / מיקום' },
  question:    { bg: '#cdb6e6', text: '#2c1f3d', label: 'מילות שאלה' },
  negation:    { bg: '#eaa39c', text: '#451b16', label: 'שלילה / חירום' },
  social:      { bg: '#f0b9cf', text: '#42202f', label: 'מילים חברתיות' },
  // שלוש קטגוריות נוספות (השלמת מפתח פיצג'רלד המשודרג)
  conjunction: { bg: '#f4f4f0', text: '#1f2937', label: 'מילות קישור' },
  adverb:      { bg: '#d6bfa0', text: '#3d2410', label: 'תארי פועל' },
  determiner:  { bg: '#c8cbd3', text: '#1e2230', label: 'מיידעים / כמתים' },
};

const NEUTRAL = { bg: '#ffffff', text: '#1f2937', label: '' };

export function fitzgeraldStyle(category?: Fitzgerald): {
  bg: string;
  text: string;
  label: string;
} {
  return category ? FITZGERALD[category] : NEUTRAL;
}

/**
 * מילון ליבה עברי → קטגוריית פיצג'רלד להצעה אוטומטית.
 * override ידני של המשתמש תמיד גובר (הצעה בלבד, לא כפייה).
 */
const CATEGORY_MAP: Readonly<Record<string, Fitzgerald>> = {
  // כינויי גוף
  'אני': 'pronoun', 'אתה': 'pronoun', 'את': 'pronoun', 'הוא': 'pronoun',
  'היא': 'pronoun', 'אנחנו': 'pronoun', 'אתם': 'pronoun', 'אתן': 'pronoun',
  'הם': 'pronoun', 'הן': 'pronoun',
  'שלי': 'pronoun', 'שלך': 'pronoun', 'שלו': 'pronoun', 'שלה': 'pronoun',
  'שלנו': 'pronoun', 'שלכם': 'pronoun', 'שלהם': 'pronoun', 'שלהן': 'pronoun',
  // פעלים
  'רוצה': 'verb', 'רוצים': 'verb', 'לרצות': 'verb',
  'אוהב': 'verb', 'אוהבת': 'verb', 'אוהבים': 'verb', 'לאהוב': 'verb',
  'יכול': 'verb', 'יכולה': 'verb', 'יכולים': 'verb',
  'צריך': 'verb', 'צריכה': 'verb', 'צריכים': 'verb',
  'הולך': 'verb', 'הולכת': 'verb', 'ללכת': 'verb',
  'אוכל': 'verb', 'אוכלת': 'verb', 'לאכול': 'verb',
  'שותה': 'verb', 'שותים': 'verb', 'לשתות': 'verb',
  'משחק': 'verb', 'משחקת': 'verb', 'לשחק': 'verb',
  'ישן': 'verb', 'ישנה': 'verb', 'לישון': 'verb',
  'יודע': 'verb', 'יודעת': 'verb', 'לדעת': 'verb',
  'מדבר': 'verb', 'מדברת': 'verb', 'לדבר': 'verb',
  'מרגיש': 'verb', 'מרגישה': 'verb', 'להרגיש': 'verb',
  'עוזר': 'verb', 'עוזרת': 'verb', 'לעזור': 'verb',
  'רואה': 'verb', 'רואים': 'verb', 'לראות': 'verb',
  'שומע': 'verb', 'שומעת': 'verb', 'לשמוע': 'verb',
  'סיים': 'verb', 'סיימתי': 'verb', 'לסיים': 'verb',
  // שלילה / חירום
  'לא': 'negation', 'אל': 'negation', 'אסור': 'negation',
  'עצור': 'negation', 'הפסק': 'negation',
  'כואב': 'negation', 'כאב': 'negation', 'עזרה': 'negation',
  // מילים חברתיות
  'כן': 'social', 'בבקשה': 'social', 'תודה': 'social',
  'שלום': 'social', 'להתראות': 'social', 'בסדר': 'social',
  'סליחה': 'social', 'יופי': 'social', 'נהדר': 'social', 'ביי': 'social',
  // מילות שאלה
  'מה': 'question', 'מי': 'question', 'איפה': 'question',
  'מתי': 'question', 'למה': 'question', 'מדוע': 'question',
  'איך': 'question', 'כיצד': 'question', 'האם': 'question',
  'איזה': 'question', 'איזו': 'question', 'כמה': 'question', 'מאיפה': 'question',
  // תארים
  'טוב': 'adjective', 'טובה': 'adjective', 'טובים': 'adjective',
  'רע': 'adjective', 'רעה': 'adjective',
  'גדול': 'adjective', 'גדולה': 'adjective',
  'קטן': 'adjective', 'קטנה': 'adjective',
  'חם': 'adjective', 'חמה': 'adjective', 'קר': 'adjective', 'קרה': 'adjective',
  'יפה': 'adjective', 'יפים': 'adjective',
  'מהיר': 'adjective', 'מהירה': 'adjective',
  'חזק': 'adjective', 'חזקה': 'adjective',
  'חלש': 'adjective', 'חלשה': 'adjective',
  'שמח': 'adjective', 'שמחה': 'adjective',
  'עצוב': 'adjective', 'עצובה': 'adjective',
  'כועס': 'adjective', 'כועסת': 'adjective',
  'מפחד': 'adjective', 'מפחדת': 'adjective',
  'עייף': 'adjective', 'עייפה': 'adjective',
  'נרגש': 'adjective', 'נרגשת': 'adjective',
  'נחמד': 'adjective', 'נחמדה': 'adjective',
  'עוד': 'adjective',
  // מילות יחס
  'על': 'preposition', 'תחת': 'preposition', 'ליד': 'preposition',
  'בתוך': 'preposition', 'מעל': 'preposition', 'מתחת': 'preposition',
  'אחרי': 'preposition', 'לפני': 'preposition', 'בין': 'preposition',
  'מול': 'preposition', 'עם': 'preposition', 'בלי': 'preposition',
  'בשביל': 'preposition', 'דרך': 'preposition', 'אצל': 'preposition',
  // שמות עצם (אוצר ליבה נפוץ)
  'אמא': 'noun', 'אבא': 'noun', 'מורה': 'noun', 'חבר': 'noun', 'חברה': 'noun',
  'ילד': 'noun', 'ילדה': 'noun', 'תינוק': 'noun',
  'בית': 'noun', 'חדר': 'noun', 'מטבח': 'noun', 'שירותים': 'noun',
  'מים': 'noun', 'לחם': 'noun', 'חלב': 'noun', 'ביצה': 'noun',
  'תפוח': 'noun', 'בננה': 'noun', 'עוגה': 'noun', 'שוקולד': 'noun',
  'כדור': 'noun', 'ספר': 'noun', 'עיפרון': 'noun',
  'שולחן': 'noun', 'כסא': 'noun', 'מיטה': 'noun',
  'מחשב': 'noun', 'טלפון': 'noun',
  'אוטו': 'noun', 'אוטובוס': 'noun', 'אופניים': 'noun',
  'כלב': 'noun', 'חתול': 'noun', 'ציפור': 'noun', 'דג': 'noun',
  'יד': 'noun', 'רגל': 'noun', 'ראש': 'noun',
  // מילות קישור
  'או': 'conjunction', 'גם': 'conjunction', 'אבל': 'conjunction',
  'כי': 'conjunction', 'אז': 'conjunction', 'אם': 'conjunction',
  'למרות': 'conjunction', 'אפילו': 'conjunction', 'רק': 'conjunction',
  'אלא': 'conjunction',
  // תארי פועל
  'עכשיו': 'adverb', 'מהר': 'adverb', 'לאט': 'adverb',
  'כאן': 'adverb', 'שם': 'adverb', 'הנה': 'adverb',
  'תמיד': 'adverb', 'לפעמים': 'adverb', 'אף פעם': 'adverb',
  'אחרכך': 'adverb', 'אחר כך': 'adverb',
  'יחד': 'adverb', 'לבד': 'adverb', 'קצת': 'adverb',
  // מיידעים / כמתים
  'כל': 'determiner', 'הרבה': 'determiner', 'מעט': 'determiner',
  'שני': 'determiner', 'שתי': 'determiner',
  'שלושה': 'determiner', 'שלוש': 'determiner',
  'ארבעה': 'determiner', 'חמישה': 'determiner',
};

/**
 * מציע קטגוריית פיצג'רלד אוטומטית לפי ה-label (חלק-דיבר).
 * מחזיר undefined אם המילה אינה מוכרת — המשתמש קובע ידנית.
 * override ידני שנשמר בתא תמיד גובר על ההצעה.
 */
export function categoryForLabel(label: string): Fitzgerald | undefined {
  const key = label.trim().replace(/[.,!?;:]/g, '');
  return CATEGORY_MAP[key];
}
