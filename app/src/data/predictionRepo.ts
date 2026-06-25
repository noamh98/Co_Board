// data/predictionRepo.ts — אחסון מקומי של מודל הניבוי (I2). פרטי, לא עולה לענן.
// נשמר ב-settings store (key/value JSON) — אדיטיבי, ללא שינוי סכמה.

import { getDb, STORE_SETTINGS } from './db';
import { type NgramModel, emptyModel, learn } from '../domain/prediction/predictor';

const KEY_PREDICTION_MODEL = 'predictionModel';

interface SettingEntry {
  key: string;
  value: string;
}

/** טוען את מודל הניבוי המקומי (ריק אם אין). */
export async function getPredictionModel(): Promise<NgramModel> {
  const db = await getDb();
  const entry = (await db.get(STORE_SETTINGS, KEY_PREDICTION_MODEL)) as
    | SettingEntry
    | undefined;
  if (!entry?.value) return emptyModel();
  try {
    return JSON.parse(entry.value) as NgramModel;
  } catch {
    return emptyModel();
  }
}

/** לומד מרצף מילים (אימרה שנבחרה) ושומר את המודל המעודכן מקומית. */
export async function recordSequence(words: string[]): Promise<void> {
  const clean = words.map((w) => w.trim()).filter(Boolean);
  if (clean.length === 0) return;
  const updated = learn(await getPredictionModel(), clean);
  const db = await getDb();
  await db.put(STORE_SETTINGS, {
    key: KEY_PREDICTION_MODEL,
    value: JSON.stringify(updated),
  });
}
