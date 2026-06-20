import { getDb, STORE_SETTINGS } from './db';
import {
  type AccessSettings,
  DEFAULT_ACCESS_SETTINGS,
} from '../domain/accessSettings';

// הגדרות מכשיר (key/value) — פרופיל פעיל וקוד מטפל (PIN). מקומי בלבד.
// ה-PIN הוא שער MVP למצב עריכה (PRD §4.5/§8.3), לא אמצעי אבטחה קריפטוגרפי.

const KEY_ACTIVE_PROFILE = 'activeProfileId';
const KEY_CAREGIVER_PIN = 'caregiverPin';
const KEY_ACCESS_SETTINGS = 'accessSettings';
const KEY_ANALYTICS_ENABLED = 'analyticsEnabled';

interface SettingEntry {
  key: string;
  value: string;
}

export interface SettingsRepo {
  getActiveProfileId(): Promise<string | undefined>;
  setActiveProfileId(id: string): Promise<void>;
  getCaregiverPin(): Promise<string | undefined>;
  setCaregiverPin(pin: string): Promise<void>;
  /** הגדרות גישה מוטורית (FR-020). מחזיר ברירת מחדל אם לא נשמרו. */
  getAccessSettings(): Promise<AccessSettings>;
  saveAccessSettings(settings: AccessSettings): Promise<void>;
  /** אנליטיקה opt-in — כבויה כברירת מחדל (M7). */
  getAnalyticsEnabled(): Promise<boolean>;
  setAnalyticsEnabled(enabled: boolean): Promise<void>;
}

async function readValue(key: string): Promise<string | undefined> {
  const db = await getDb();
  const entry = (await db.get(STORE_SETTINGS, key)) as SettingEntry | undefined;
  return entry?.value;
}

async function writeValue(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.put(STORE_SETTINGS, { key, value });
}

async function getAccessSettings(): Promise<AccessSettings> {
  const raw = await readValue(KEY_ACCESS_SETTINGS);
  if (!raw) return { ...DEFAULT_ACCESS_SETTINGS };
  try {
    // מיזוג עם ברירת מחדל — סובלני לשדות חדשים שיתווספו בעתיד (upgrade אדיטיבי).
    return { ...DEFAULT_ACCESS_SETTINGS, ...(JSON.parse(raw) as Partial<AccessSettings>) };
  } catch {
    return { ...DEFAULT_ACCESS_SETTINGS };
  }
}

export function createSettingsRepo(): SettingsRepo {
  return {
    getActiveProfileId: () => readValue(KEY_ACTIVE_PROFILE),
    setActiveProfileId: (id) => writeValue(KEY_ACTIVE_PROFILE, id),
    getCaregiverPin: () => readValue(KEY_CAREGIVER_PIN),
    setCaregiverPin: (pin) => writeValue(KEY_CAREGIVER_PIN, pin),
    getAccessSettings,
    saveAccessSettings: (settings) =>
      writeValue(KEY_ACCESS_SETTINGS, JSON.stringify(settings)),
    getAnalyticsEnabled: async () => {
      const raw = await readValue(KEY_ANALYTICS_ENABLED);
      return raw === 'true';
    },
    setAnalyticsEnabled: (enabled) =>
      writeValue(KEY_ANALYTICS_ENABLED, String(enabled)),
  };
}
