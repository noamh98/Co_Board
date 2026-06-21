import {
  HOME_BOARD,
  LIBRARY_BOARDS,
  DEMO_PROFILE_V2,
} from '../domain/boardLibrary';
import { getTemplate } from '../domain/boardTemplates';
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

/** יוצר פרופיל ילד חדש עם לוח-בית עצמאי (קלון של לוח הבית). נעול כברירת מחדל. */
export async function createProfile(name: string): Promise<Profile> {
  const boardRepo = createBoardRepo();
  const profileRepo = createProfileRepo();

  // ספריית הלוחות כבר נזרעה; מוצא את לוח הבית ומשכפל.
  const libraryBoards = await boardRepo.list();
  const homeSource =
    libraryBoards.find((b) => b.isCoreBoard) ?? LIBRARY_BOARDS[0];

  const board = cloneBoard(homeSource, `לוח בית — ${name}`);
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
 * Seed חד-פעמי: בהתקנה נקייה (אין פרופילים כלל) נזרעים כל לוחות הספרייה + פרופיל דמו.
 * idempotent — לא דורס נתונים קיימים. מוודא שקיים קוד מטפל (PIN) ברירת-מחדל.
 * M2 upgrade: אם קיימים פרופילים, מזריע רק לוחות ספרייה חסרים (idempotent).
 */
export async function ensureSeeded(): Promise<void> {
  const profileRepo = createProfileRepo();
  const boardRepo = createBoardRepo();
  const settingsRepo = createSettingsRepo();

  const existing = await profileRepo.list({ includeArchived: true });
  if (existing.length === 0) {
    // התקנה נקייה: seed כל הספרייה + פרופיל דמו
    for (const board of LIBRARY_BOARDS) {
      await boardRepo.save(board);
    }
    await profileRepo.save({ ...DEMO_PROFILE_V2 });
    await settingsRepo.setActiveProfileId(DEMO_PROFILE_V2.id);
  } else {
    // M2 upgrade: הוסף לוחות ספרייה חסרים (לא דורס קיימים)
    await seedLibraryBoards(boardRepo);
  }
  if (!(await settingsRepo.getCaregiverPin())) {
    await settingsRepo.setCaregiverPin(DEFAULT_PIN);
  }
}

/** מוסיף לוחות ספרייה חסרים (idempotent) — לא דורס לוחות קיימים. */
async function seedLibraryBoards(
  boardRepo: ReturnType<typeof createBoardRepo>,
): Promise<void> {
  for (const board of LIBRARY_BOARDS) {
    const exists = await boardRepo.get(board.id);
    if (!exists) {
      await boardRepo.save(board);
    }
  }
}

export interface ActiveContext {
  profiles: Profile[];
  activeProfile: Profile;
  board: Board;
  /** כל לוחות הספרייה הפעילים (לשימוש מחסנית הניווט). */
  allBoards: Record<string, Board>;
}

/** טוען פרופילים פעילים, פרופיל נבחר, לוח בית ומלאי לוחות מה-DB. */
export async function loadActiveContext(): Promise<ActiveContext> {
  const profileRepo = createProfileRepo();
  const boardRepo = createBoardRepo();
  const settingsRepo = createSettingsRepo();

  const profiles = await profileRepo.list();
  const activeId = await settingsRepo.getActiveProfileId();
  const activeProfile = profiles.find((p) => p.id === activeId) ?? profiles[0];

  const allBoardsList = await boardRepo.list();
  const allBoards = Object.fromEntries(allBoardsList.map((b) => [b.id, b]));

  // נפילה חיננית ללוח הבית אם רשומת הלוח חסרה.
  const board = allBoards[activeProfile.homeBoardId] ?? HOME_BOARD;

  return { profiles, activeProfile, board, allBoards };
}

/** מעבר פרופיל פעיל (נעול בקוד ב-UI). מחזיר את ההקשר הפעיל המעודכן. */
export async function switchActiveProfile(id: string): Promise<ActiveContext> {
  await createSettingsRepo().setActiveProfileId(id);
  return loadActiveContext();
}

/**
 * יוצר פרופיל חדש מתבנית לוח. אם templateId אינו ידוע — נפילה ל-blank4x4.
 * מחזיר profileId של הפרופיל שנוצר.
 */
export async function createProfileFromTemplate(
  name: string,
  templateId: string,
): Promise<string> {
  const template =
    getTemplate(templateId) ?? getTemplate('blank4x4')!;

  const boardRepo = createBoardRepo();
  const profileRepo = createProfileRepo();

  const board = cloneBoard(template.board, `לוח בית — ${name}`);
  await boardRepo.save(board);

  const profile: Profile = {
    id: newId('profile'),
    name,
    defaultVoice: 'child',
    homeBoardId: board.id,
    locked: true,
  };
  await profileRepo.save(profile);
  return profile.id;
}
