"use strict";
// functions/src/contentFilter.ts — פילטר התאמה-לילדים לפלט aiBoard + סניטציית topic (4.7).
// E-10: פלט Gemini מוצג לילד ללא בדיקה — רשימת-חסימה צד-שרת היא קו הגנה אחרון.
// E-06: ה-topic משורבב ל-prompt בתוך מרכאות — תווי תיחום מוסרים כדי שקלט זדוני
//       לא "יברח" מההקשר (prompt-injection היגייני; לא תחליף לולידציה באורך אצל הקורא).
//
// עקרון התאמה: התאמה מדויקת על המילה המנורמלת (ללא ניקוד, lowercase), לא substring —
// substring היה פוסל אוצר-מילים AAC לגיטימי (למשל "כוס" = ספל; "תחת" = מתחת).
// לכן הרשימה כוללת רק מונחים חד-משמעיים. הרחבה עתידית: רשימה דינמית ב-config/flags.
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeTopic = sanitizeTopic;
exports.isBlockedWord = isBlockedWord;
exports.filterInappropriateWords = filterInappropriateWords;
/** מסיר תווי בקרה, תווי תיחום (מרכאות/סוגריים/JSON) ורווחים כפולים מה-topic. */
function sanitizeTopic(raw) {
    return raw
        .replace(/[\u0000-\u001f\u007f]/g, ' ') // תווי בקרה (כולל newline — שובר הוראות prompt)
        .replace(/["'`\\{}[\]<>]/g, '') // תווי תיחום — מונעים בריחה מהמרכאות ב-prompt
        .replace(/\s+/g, ' ')
        .trim();
}
/** נרמול להשוואה: הסרת ניקוד/טעמים, lowercase, הסרת פיסוק עוטף. */
function normalizeWord(w) {
    return w
        .replace(/[\u0591-\u05c7]/g, '') // ניקוד + טעמי מקרא
        .toLowerCase()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}\s]+$/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * מונחים חד-משמעיים שאינם מתאימים ללוח תקשורת של ילד (מיניות מפורשת, גסויות,
 * סמים קשים). בכוונה *לא* כולל מילים דו-משמעיות (כוס, תחת, חזה) או אוצר-מילים
 * רגשי/גופני לגיטימי — חסימת-יתר פוגעת בדיוק במשתמשים שהמוצר קיים בשבילם.
 */
const BLOCKED_TERMS = new Set([
    // עברית — מיניות/גסויות
    'סקס',
    'זיון',
    'לזיין',
    'זונה',
    'בן זונה',
    'שרמוטה',
    'פורנו',
    'פורנוגרפיה',
    // עברית — סמים קשים
    'הרואין',
    'קוקאין',
    'אקסטזי',
    // אנגלית
    'sex',
    'porn',
    'porno',
    'fuck',
    'fucking',
    'shit',
    'bitch',
    'dick',
    'cock',
    'pussy',
    'heroin',
    'cocaine',
].map(normalizeWord));
/** האם המילה (לאחר נרמול) חסומה. התאמה מדויקת על הביטוי המלא. */
function isBlockedWord(word) {
    return BLOCKED_TERMS.has(normalizeWord(word));
}
/** מסנן מילים בלתי-הולמות מפלט ה-AI. שומר את המבנה; לא נוגע במילים כשרות. */
function filterInappropriateWords(words) {
    return words.filter((w) => typeof w.word === 'string' && !isBlockedWord(w.word));
}
//# sourceMappingURL=contentFilter.js.map