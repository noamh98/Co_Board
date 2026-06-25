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
const KEY_SELECTED_VOICE_URI = 'selectedVoiceURI';
const KEY_TTS_RATE = 'ttsRate';
const KEY_TTS_PITCH = 'ttsPitch';
const KEY_TTS_PROVIDER = 'ttsProvider';
const KEY_TTS_API_KEY = 'ttsApiKey';
const KEY_SYNC_PHOTOS = 'syncPhotos';
const KEY_DARK_MODE = 'darkMode';
const KEY_LAST_SYNC_AT = 'lastSyncAt';

const DEFAULT_TTS_RATE = 1.0;
const DEFAULT_TTS_PITCH = 1.0;

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
  /** קול TTS שנבחר ע"י המטפל (FR-010). null = ברירת מחדל. */
  getSelectedVoiceURI(): Promise<string | null>;
  setSelectedVoiceURI(uri: string | null): Promise<void>;
  /** קצב הקראה (FR-010 הרחבה). ברירת מחדל 1.0. */
  getTtsRate(): Promise<number>;
  setTtsRate(n: number): Promise<void>;
  /** גובה צליל (FR-010 הרחבה). ברירת מחדל 1.0. */
  getTtsPitch(): Promise<number>;
  setTtsPitch(n: number): Promise<void>;
}

async function readNumber(key: string, fallback: number): Promise<number> {
  const raw = await readValue(key);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
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

export async function getTtsProvider(): Promise<'google' | 'azure' | 'none'> {
  const raw = await readValue(KEY_TTS_PROVIDER);
  return (raw as 'google' | 'azure' | 'none') ?? 'none';
}
export async function setTtsProvider(p: 'google' | 'azure' | 'none'): Promise<void> {
  await writeValue(KEY_TTS_PROVIDER, p);
}
export async function getTtsApiKey(): Promise<string | null> {
  const raw = await readValue(KEY_TTS_API_KEY);
  return raw ?? null;
}
export async function setTtsApiKey(key: string | null): Promise<void> {
  if (key === null) {
    const db = await getDb();
    await db.delete(STORE_SETTINGS, KEY_TTS_API_KEY);
  } else {
    await writeValue(KEY_TTS_API_KEY, key);
  }
}

/** האם לסנכרן תמונות אישיות לענן (ברירת מחדל: false — מקומי בלבד). */
export async function getSyncPhotos(): Promise<boolean> {
  const raw = await readValue(KEY_SYNC_PHOTOS);
  return raw === 'true';
}
export async function setSyncPhotos(enabled: boolean): Promise<void> {
  await writeValue(KEY_SYNC_PHOTOS, String(enabled));
}

/** חותמת הסנכרון המוצלח האחרון (epoch ms). 0 אם מעולם לא סונכרן (C2 — pull אינקרמנטלי). */
export async function getLastSyncAt(): Promise<number> {
  return readNumber(KEY_LAST_SYNC_AT, 0);
}
export async function setLastSyncAt(n: number): Promise<void> {
  await writeValue(KEY_LAST_SYNC_AT, String(n));
}

/** מצב לילה ידני (ברירת מחדל: false — עוקב אחר הגדרות מערכת). */
export async function getDarkMode(): Promise<boolean> {
  const raw = await readValue(KEY_DARK_MODE);
  return raw === 'true';
}
export async function setDarkMode(enabled: boolean): Promise<void> {
  await writeValue(KEY_DARK_MODE, String(enabled));
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
    getSelectedVoiceURI: async () => (await readValue(KEY_SELECTED_VOICE_URI)) ?? null,
    setSelectedVoiceURI: async (uri) => {
      if (uri === null) {
        const db = await getDb();
        await db.delete(STORE_SETTINGS, KEY_SELECTED_VOICE_URI);
      } else {
        await writeValue(KEY_SELECTED_VOICE_URI, uri);
      }
    },
    getTtsRate: () => readNumber(KEY_TTS_RATE, DEFAULT_TTS_RATE),
    setTtsRate: (n) => writeValue(KEY_TTS_RATE, String(n)),
    getTtsPitch: () => readNumber(KEY_TTS_PITCH, DEFAULT_TTS_PITCH),
    setTtsPitch: (n) => writeValue(KEY_TTS_PITCH, String(n)),
  };
}
