// services/notify/notifyService.ts — ערוץ הודעות שגיאה למשתמש (Phase 1.7, ממצא U-1).
// pub/sub מינימלי: כל שכבה יכולה לדווח כשל בפעולת-משתמש; ה-presentation מציג toast.
// לא מיועד לבליעות מכוונות (prune/telemetry) — שם נשארת בליעה שקטה עם הערה.

type ErrorListener = (message: string) => void;

const listeners = new Set<ErrorListener>();

/** מדווח כשל בפעולת-משתמש. ההודעה בעברית, קצרה, בגובה-עיניים. */
export function notifyError(message: string): void {
  for (const l of listeners) l(message);
}

/** הרשמה לקבלת הודעות שגיאה. מחזיר פונקציית ביטול. */
export function onNotifyError(listener: ErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
