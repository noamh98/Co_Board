// presentation/auth/translateFirebaseError.ts — תרגום שגיאות Firebase Auth לעברית.
// Phase 1 (de-dup translateError): מקור-אמת יחיד למיפוי קודי auth/* → הודעות עברית,
// במקום כפילות זהה ב-LoginPanel וב-RegisterPanel. פונקציה טהורה המאחדת את האיחוד
// של שני הפאנלים (LoginPanel הוא העל-קבוצה; RegisterPanel הוא תת-קבוצה מקריו).

/**
 * ממפה שגיאת Firebase Auth להודעה ידידותית בעברית.
 * @param code מחרוזת השגיאה (לרוב error.message — מכילה קוד בסגנון `auth/...`).
 * @returns הודעת שגיאה בעברית.
 */
export function translateFirebaseError(code: string): string {
  const msg = code;
  if (msg.includes('wrong-password') || msg.includes('invalid-credential'))
    return 'סיסמה שגויה או משתמש לא קיים';
  if (msg.includes('user-not-found')) return 'משתמש לא נמצא';
  if (msg.includes('email-already-in-use')) return 'כתובת אימייל כבר בשימוש';
  if (msg.includes('invalid-email')) return 'כתובת אימייל לא תקינה';
  if (msg.includes('weak-password')) return 'הסיסמה חלשה מדי (לפחות 6 תווים)';
  if (msg.includes('network-request-failed') || msg.includes('offline'))
    return 'אין חיבור לרשת — נסה שנית';
  if (msg.includes('operation-not-allowed'))
    return 'כניסה עם Google לא מופעלת — יש להפעיל ב-Firebase Console → Authentication → Sign-in method';
  if (msg.includes('unauthorized-domain'))
    return 'הדומיין לא מורשה — יש להוסיף co-board.web.app לרשימת הדומיינים המורשים ב-Firebase Console → Authentication → Settings';
  if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request'))
    return 'החלון נסגר לפני השלמת הכניסה — נסה שנית';
  if (msg.includes('popup-blocked'))
    return 'הדפדפן חסם את חלון הכניסה — אפשר popup לאתר זה ונסה שנית';
  // שגיאה לא מזוהה — הצג את הקוד לאבחון אם קיים בפורמט (auth/...).
  const codeMatch = msg.match(/\(auth\/([^)]+)\)/);
  if (codeMatch) return `שגיאה: ${codeMatch[1]}`;
  return 'שגיאה, נסה שנית';
}
