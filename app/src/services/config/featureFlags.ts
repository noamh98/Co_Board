// services/config/featureFlags.ts — דגלי תכונה מרוחקים (B-17 / 4.8).
// מקור אמת: מסמך Firestore יחיד `config/flags` — { [flagName]: boolean }.
// נכתב מהקונסולה/Admin SDK בלבד (חוקי Firestore חוסמים כתיבת-לקוח) — מאפשר
// gradual rollout / kill-switch בלי deploy.
//
// אינווריאנט offline-first: כשל שליפה (offline, אין קונפיג Firebase, חוקים) לעולם
// אינו שובר את האפליקציה — נופל ל-cache המקומי האחרון-שנודע, ואם אין — לברירת
// המחדל שהקורא סיפק. ברירת מחדל שמרנית: דגל לא-ידוע = כבוי.
//
// קונבנציית rollout: דגל חדש נולד false ← מופעל ל-staging ← מופעל לפרודקשן ←
// אחרי התייצבות, הקוד המותנה הופך לקבוע והדגל נמחק מהמסמך (אין דגלים נצחיים).

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getFirebaseConfig } from '../../data/firebaseEnv';
import { getDb, STORE_SETTINGS } from '../../data/db';

export type FeatureFlags = Record<string, boolean>;

const CACHE_KEY = 'featureFlagsCache';

let memoryFlags: FeatureFlags | null = null;
let loadPromise: Promise<FeatureFlags> | null = null;

function getApp(): FirebaseApp {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  return initializeApp(getFirebaseConfig());
}

/** שליפת המסמך מ-Firestore. זורק בכשל — הטיפול אצל loadFeatureFlags. */
async function fetchRemoteFlags(): Promise<FeatureFlags> {
  const db = getFirestore(getApp());
  const snap = await getDoc(doc(db, 'config', 'flags'));
  if (!snap.exists()) return {};
  const data = snap.data();
  const flags: FeatureFlags = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'boolean') flags[k] = v; // ערכים לא-בוליאניים מסוננים בשקט
  }
  return flags;
}

async function readCache(): Promise<FeatureFlags | null> {
  try {
    const db = await getDb();
    const entry = (await db.get(STORE_SETTINGS, CACHE_KEY)) as
      | { key: string; value: string }
      | undefined;
    if (!entry) return null;
    return JSON.parse(entry.value) as FeatureFlags;
  } catch {
    return null;
  }
}

async function writeCache(flags: FeatureFlags): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_SETTINGS, { key: CACHE_KEY, value: JSON.stringify(flags) });
  } catch {
    // cache הוא best-effort — כשל כתיבה אינו משבש את הזרימה.
  }
}

/**
 * טוען את הדגלים (memoized לכל חיי הטאב): רשת ← cache מקומי ← {}.
 * @param fetcher הזרקה לבדיקות; ברירת מחדל — Firestore.
 */
export function loadFeatureFlags(
  fetcher: () => Promise<FeatureFlags> = fetchRemoteFlags,
): Promise<FeatureFlags> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const flags = await fetcher();
      memoryFlags = flags;
      await writeCache(flags);
      return flags;
    } catch {
      const cached = await readCache();
      memoryFlags = cached ?? {};
      return memoryFlags;
    }
  })();
  return loadPromise;
}

/**
 * האם דגל מופעל. defaultValue מוחזר כשהדגל אינו מוגדר במסמך (ברירת מחדל: כבוי).
 */
export async function isFeatureEnabled(name: string, defaultValue = false): Promise<boolean> {
  const flags = memoryFlags ?? (await loadFeatureFlags());
  return flags[name] ?? defaultValue;
}

/** איפוס מצב מודול — לבדיקות בלבד. */
export function resetFeatureFlagsForTests(): void {
  memoryFlags = null;
  loadPromise = null;
}
