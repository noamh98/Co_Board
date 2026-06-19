import { getDb, STORE_SETTINGS } from './db';

// הגדרות מכשיר (key/value) — פרופיל פעיל וקוד מטפל (PIN). מקומי בלבד.
// ה-PIN הוא שער MVP למצב עריכה (PRD §4.5/§8.3), לא אמצעי אבטחה קריפטוגרפי.

const KEY_ACTIVE_PROFILE = 'activeProfileId';
const KEY_CAREGIVER_PIN = 'caregiverPin';

interface SettingEntry {
  key: string;
  value: string;
}

export interface SettingsRepo {
  getActiveProfileId(): Promise<string | undefined>;
  setActiveProfileId(id: string): Promise<void>;
  getCaregiverPin(): Promise<string | undefined>;
  setCaregiverPin(pin: string): Promise<void>;
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

export function createSettingsRepo(): SettingsRepo {
  return {
    getActiveProfileId: () => readValue(KEY_ACTIVE_PROFILE),
    setActiveProfileId: (id) => writeValue(KEY_ACTIVE_PROFILE, id),
    getCaregiverPin: () => readValue(KEY_CAREGIVER_PIN),
    setCaregiverPin: (pin) => writeValue(KEY_CAREGIVER_PIN, pin),
  };
}
