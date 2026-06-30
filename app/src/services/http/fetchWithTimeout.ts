// services/http/fetchWithTimeout.ts — fetch עם תקרת זמן (Phase 1, H-API).
// עוטף fetch ב-AbortController כדי שבקשת רשת תקועה לא תיתלה לנצח. Offline-first:
// כשל מהיר (timeout) מאפשר נפילה חיננית ל-cache/ברירת מחדל במקום המתנה אינסופית.
// ללא תלות חיצונית. הטיימר משוחרר תמיד ב-finally; בעת timeout נזרקת שגיאה בעברית.

/**
 * מבצע fetch עם תקרת זמן. ברירת מחדל 15 שניות.
 * @param url       כתובת היעד.
 * @param init      אפשרויות fetch (אופציונלי). signal פנימי גובר לצורך ה-timeout.
 * @param timeoutMs תקרת הזמן במילי-שניות (ברירת מחדל 15000).
 * @returns ה-Response שהתקבל מהשרת.
 * @throws Error('הבקשה לא הגיבה בזמן') אם חלף ה-timeout לפני קבלת תגובה.
 */
export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    // אם ה-abort הגיע מה-timeout שלנו — נחזיר שגיאת זמן ברורה בעברית.
    if (controller.signal.aborted) {
      throw new Error('הבקשה לא הגיבה בזמן');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
