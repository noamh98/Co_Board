// data/deviceId.ts — מזהה מכשיר יציב המאוחסן ב-IDB (Phase 0, H-SYNC / CR-6).
// היה ב-localStorage → מצב פרטי מנקה אותו בכל טעינה → churn ב-outbox → LWW לא אמין.
// עכשיו: מקור-אמת ב-STORE_SETTINGS (כמו כל שאר ההגדרות). מיגרציה חד-פעמית קוראת את
// הערך הישן מ-localStorage כדי לא לאפס התקנות קיימות.

import { getDb, STORE_SETTINGS } from './db';

const DEVICE_ID_KEY = 'sync-device-id'; // אותו מפתח legacy ב-localStorage (למיגרציה).
const SETTINGS_KEY = 'deviceId';

interface SettingEntry {
  key: string;
  value: string;
}

let cached: string | null = null;
let inflight: Promise<string> | null = null;

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `dev-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/**
 * מזהה המכשיר (IDB). מבצע מיגרציה חד-פעמית מ-localStorage אם קיים שם ערך ישן.
 * ממוזכר בזיכרון — קריאות חוזרות אינן נוגעות ב-IDB.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    const db = await getDb();
    const existing = (await db.get(STORE_SETTINGS, SETTINGS_KEY)) as SettingEntry | undefined;
    if (existing?.value) {
      cached = existing.value;
      return cached;
    }
    // מיגרציה: אמץ ערך legacy מ-localStorage אם קיים, אחרת צור חדש.
    let id: string | null = null;
    try {
      id = localStorage.getItem(DEVICE_ID_KEY);
    } catch {
      // localStorage חסום (מצב פרטי קשיח) — נייצר חדש.
    }
    if (!id) id = newId();
    await db.put(STORE_SETTINGS, { key: SETTINGS_KEY, value: id });
    cached = id;
    return id;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * גישה סינכרונית לערך המוזכר (אחרי primeDeviceId/getDeviceId ראשון).
 * לפני האתחול מחזיר ערך זמני יציב-לסשן — לא נשמר עד ש-getDeviceId() ירוץ.
 * נדרש כי syncProvider.getDeviceId() ו-recordLocalWrite משתמשים סינכרונית.
 */
let sessionFallback: string | null = null;
export function getDeviceIdSync(): string {
  if (cached) return cached;
  if (!sessionFallback) sessionFallback = newId();
  return sessionFallback;
}

/** קריאה ב-bootstrap — מאתחל את ה-cache (וה-migration) מוקדם. */
export async function primeDeviceId(): Promise<void> {
  await getDeviceId();
}

/** לבדיקות בלבד — מאפס את ה-cache. */
export function _resetDeviceIdCacheForTests(): void {
  cached = null;
  inflight = null;
  sessionFallback = null;
}
