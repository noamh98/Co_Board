import type { Board, Cell, Profile } from './models';

// לוח ליבה לדוגמה ל-M0 — אוצר ליבה עברי במיקום קבוע (Motor Planning).
// משמש את הפרוסה האנכית (domain → services → UI). יוחלף בספריית לוחות מלאה ב-M1/M2.

function core(
  id: string,
  label: string,
  fitz: Cell['fitzgerald'],
  nikud: string,
): Cell {
  return {
    id,
    label,
    nikud,
    vocalization: nikud,
    fitzgerald: fitz,
    isCore: true,
    action: { type: 'speak' },
  };
}

const cellsArr: Cell[] = [
  core('i', 'אני', 'pronoun', 'אֲנִי'),
  core('want', 'רוצה', 'verb', 'רוֹצֶה'),
  core('more', 'עוד', 'adjective', 'עוֹד'),
  core('yes', 'כן', 'social', 'כֵּן'),
  core('no', 'לא', 'negation', 'לֹא'),
  core('eat', 'לאכול', 'verb', 'לֶאֱכוֹל'),
  core('play', 'לשחק', 'verb', 'לְשַׂחֵק'),
  core('help', 'עזרה', 'negation', 'עֶזְרָה'),
  core('done', 'סיימתי', 'verb', 'סִיַּמְתִּי'),
];

export const SAMPLE_CORE_BOARD: Board = {
  id: 'home-core-9',
  name: 'לוח בית — מתחילים',
  grid: { rows: 3, cols: 3 },
  isCoreBoard: true,
  cells: Object.fromEntries(cellsArr.map((c) => [c.id, c])),
  // RTL: col=0 = העמודה הימנית ביותר.
  placements: [
    { cellId: 'i', row: 0, col: 0 },
    { cellId: 'want', row: 0, col: 1 },
    { cellId: 'more', row: 0, col: 2 },
    { cellId: 'yes', row: 1, col: 0 },
    { cellId: 'no', row: 1, col: 1 },
    { cellId: 'eat', row: 1, col: 2 },
    { cellId: 'play', row: 2, col: 0 },
    { cellId: 'help', row: 2, col: 1 },
    { cellId: 'done', row: 2, col: 2 },
  ],
};

export const SAMPLE_PROFILE: Profile = {
  id: 'demo',
  name: 'דמו',
  defaultVoice: 'child',
  homeBoardId: SAMPLE_CORE_BOARD.id,
  locked: true,
};
