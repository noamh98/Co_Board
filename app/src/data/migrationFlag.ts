// data/migrationFlag.ts — דגל כשל-מיגרציה מתמשך (Phase 3, H-IDB / CR-5). ⚠️ scaffold-נתמך.
// משמש את מיגרציית v8→cursor העתידית: אם ה-upgrade נכשל (Safari עלול לבצע abort שקט),
// נרים דגל שה-UI יציג ("שדרוג הנתונים נכשל — צור קשר/גבה"). util אמיתי וקטן — מוכן לשימוש.

const KEY = 'co-board:migration-failed';

export function setMigrationFailed(reason: string): void {
  try {
    localStorage.setItem(KEY, reason || '1');
  } catch {
    // localStorage חסום — אין מה לעשות; המיגרציה ממילא נכשלה.
  }
}

export function getMigrationFailure(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearMigrationFailure(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

// TODO(Phase 3): בעת המרת מיגרציית v8 ל-cursor (db.ts) — לעטוף ב-try/catch,
//   לקרוא setMigrationFailed(...) בכשל, ולהציג getMigrationFailure() במסך פתיחה.
