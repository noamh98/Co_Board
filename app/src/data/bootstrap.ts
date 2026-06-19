import { SAMPLE_CORE_BOARD, SAMPLE_PROFILE } from '../domain/sampleBoard';
import { DEFAULT_PIN } from '../domain/access';
import type { Board, Profile } from '../domain/models';
import { createBoardRepo } from './boardRepo';
import { createProfileRepo } from './profileRepo';
import { createSettingsRepo } from './settingsRepo';

// אתחול שכבת Data לצריכת ה-UI: seed ראשוני, יצירת פרופיל, וטעינת ההקשר הפעיל.
// אינווריאנט: offline-first — הכול נקרא/נכתב מקומית; אין תלות ברשת (HANDOFF §4).

function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${rand}`;
}

/**
 * קלון עמוק של לוח עם מזהה חדש — שכפול לא הורס את המקור (PRD §4.1 edge case).
 * מיקומי התאים (placements) נשמרים כמות שהם → עקביות מוטורית נשמרת בקלון.
 */
export function cloneBoard(source: Board, name: string): Board {
  return {
    id: newId('board'),
    name,
    grid: { ...source.grid },
    cells: structuredClone(source.cells),
    placements: source.placements.map((p) => ({ ...p })),
    isCoreBoard: false,
  };
}

/** יוצר פרופיל ילד חדש עם לוח-בית עצמאי (קלון של לוח הליבה). נעול כברירת מחדל. */
export async function createProfile(name: string): Promise<Profile> {
  const boardRepo = createBoardRepo();
  const profileRepo = createProfileRepo();

  const board = cloneBoard(SAMPLE_CORE_BOARD, `לוח בית — ${name}`);
  await boardRepo.save(board);

  const profile: Profile = {
    id: newId('profile'),
    name,
    defaultVoice: 'child',
    homeBoardId: board.id,
    locked: true,
  };
  await profileRepo.save(profile);
  return profile;
}

/**
 * Seed חד-פעמי: בהתקנה נקייה בלבד (אין פרופילים כלל) נזרע פרופיל הדמו ולוח הליבה.
 * idempotent — לא דורס נתונים קיימים. כן מוודא שקיים קוד מטפל (PIN) ברירת-מחדל.
 */
export async function ensureSeeded(): Promise<void> {
  const profileRepo = createProfileRepo();
  const boardRepo = createBoardRepo();
  const settingsRepo = createSettingsRepo();

  const existing = await profileRepo.list({ includeArchived: true });
  if (existing.length === 0) {
    await boardRepo.save({ ...SAMPLE_CORE_BOARD });
    await profileRepo.save({ ...SAMPLE_PROFILE });
    await settingsRepo.setActiveProfileId(SAMPLE_PROFILE.id);
  }
  if (!(await settingsRepo.getCaregiverPin())) {
    await settingsRepo.setCaregiverPin(DEFAULT_PIN);
  }
}

export interface ActiveContext {
  profiles: Profile[];
  activeProfile: Profile;
  board: Board;
}

/** טוען את הפרופילים הפעילים, הפרופיל הנבחר ולוח הבית שלו מה-DB (לא מהקבוע). */
export async function loadActiveContext(): Promise<ActiveContext> {
  const profileRepo = createProfileRepo();
  const boardRepo = createBoardRepo();
  const settingsRepo = createSettingsRepo();

  const profiles = await profileRepo.list();
  const activeId = await settingsRepo.getActiveProfileId();
  const activeProfile = profiles.find((p) => p.id === activeId) ?? profiles[0];
  // נפילה חיננית ללוח הליבה אם רשומת הלוח חסרה (לא אמור לקרות אחרי seed).
  const board =
    (await boardRepo.get(activeProfile.homeBoardId)) ?? SAMPLE_CORE_BOARD;

  return { profiles, activeProfile, board };
}

/** מעבר פרופיל פעיל (נעול בקוד ב-UI). מחזיר את ההקשר הפעיל המעודכן. */
export async function switchActiveProfile(id: string): Promise<ActiveContext> {
  await createSettingsRepo().setActiveProfileId(id);
  return loadActiveContext();
}
