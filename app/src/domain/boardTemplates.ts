import type { Board, Cell, Fitzgerald } from './models';
import { categoryForLabel } from './fitzgerald';
import {
  HOME_BOARD,
  CORE_VOCAB_6X4_BOARD,
  CORE_VOCAB_6X6_BOARD,
  FEELINGS_6X4_BOARD,
} from './boardLibrary';

export interface BoardTemplate {
  id: string;
  nameHe: string;
  description: string;
  board: Board;
}

function cell(
  id: string,
  label: string,
  nikud: string,
  fitz: Fitzgerald,
  isCore = false,
): Cell {
  return {
    id,
    label,
    nikud,
    vocalization: nikud,
    fitzgerald: fitz,
    isCore,
    action: { type: 'speak' },
  };
}

// ─── core4x4 ─────────────────────────────────────────────────────────────────
// מבוסס על HOME_BOARD הקיים — מילות ליבה + ניווט קטגוריות, Fitzgerald מלא.
const CORE4X4_BOARD: Board = HOME_BOARD;

// ─── pecs6x3 ─────────────────────────────────────────────────────────────────
const pecsCells: Cell[] = [
  // שורה 0 — ליבה בסיסית
  cell('tp-i', 'אני', 'אֲנִי', 'pronoun', true),
  cell('tp-want', 'רוצה', 'רוֹצֶה', 'verb', true),
  cell('tp-yes', 'כן', 'כֵּן', 'social', true),
  cell('tp-no', 'לא', 'לֹא', 'negation', true),
  cell('tp-more', 'עוד', 'עוֹד', 'adjective', true),
  cell('tp-done', 'סיימתי', 'סִיַּמְתִּי', 'verb', true),
  // שורה 1 — פעולות
  cell('tp-eat', 'לאכול', 'לֶאֱכוֹל', 'verb'),
  cell('tp-drink', 'לשתות', 'לִשְׁתּוֹת', 'verb'),
  cell('tp-play', 'לשחק', 'לְשַׂחֵק', 'verb'),
  cell('tp-help', 'עזרה', 'עֶזְרָה', 'negation'),
  cell('tp-water', 'מים', 'מַיִם', 'noun'),
  cell('tp-food', 'אוכל', 'אֹכֶל', 'noun'),
  // שורה 2 — רגשות + חברתי
  cell('tp-happy', 'שמח', 'שָׂמֵחַ', 'adjective'),
  cell('tp-sad', 'עצוב', 'עָצוּב', 'adjective'),
  cell('tp-hurt', 'כואב', 'כּוֹאֵב', 'negation'),
  cell('tp-please', 'בבקשה', 'בְּבַקָּשָׁה', 'social'),
  cell('tp-thanks', 'תודה', 'תּוֹדָה', 'social'),
  cell('tp-stop', 'עצור', 'עֲצוֹר', 'negation'),
];

const PECS6X3_BOARD: Board = {
  id: 'tpl-pecs6x3',
  name: 'לוח PECS בסיסי',
  grid: { rows: 3, cols: 6 },
  cells: Object.fromEntries(pecsCells.map((c) => [c.id, c])),
  placements: pecsCells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 6),
    col: i % 6,
  })),
};

// ─── feelings3x3 ─────────────────────────────────────────────────────────────
const feelingsCells: Cell[] = [
  cell('tf-happy', 'שמח', 'שָׂמֵחַ', 'adjective'),
  cell('tf-sad', 'עצוב', 'עָצוּב', 'adjective'),
  cell('tf-angry', 'כועס', 'כּוֹעֵס', 'adjective'),
  cell('tf-scared', 'מפחד', 'מְפַחֵד', 'adjective'),
  cell('tf-excited', 'נרגש', 'נִרְגָּשׁ', 'adjective'),
  cell('tf-tired', 'עייף', 'עָיֵף', 'adjective'),
  cell('tf-hurt', 'כואב', 'כּוֹאֵב', 'negation'),
  cell('tf-love', 'אוהב', 'אוֹהֵב', 'verb'),
  cell('tf-ok', 'בסדר', 'בְּסֵדֶר', 'social'),
];

const FEELINGS3X3_BOARD: Board = {
  id: 'tpl-feelings3x3',
  name: 'רגשות',
  grid: { rows: 3, cols: 3 },
  cells: Object.fromEntries(feelingsCells.map((c) => [c.id, c])),
  placements: feelingsCells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 3),
    col: i % 3,
  })),
};

// ─── blank4x4 ────────────────────────────────────────────────────────────────
const BLANK4X4_BOARD: Board = {
  id: 'tpl-blank4x4',
  name: 'לוח ריק',
  grid: { rows: 4, cols: 4 },
  cells: {},
  placements: [],
};

// ─── תבניות נושאיות עשירות (F5) ───────────────────────────────────────────────
// data-driven: הקטגוריה (Fitzgerald) נגזרת מהמילון הקנוני (categoryForLabel), והניקוד
// מושאר לשירות הניקוד בזמן ריצה — לא ממציאים ניקוד שעלול להיות שגוי (Ponytail + דיוק לשוני).
function themed(id: string, label: string): Cell {
  const fitz = categoryForLabel(label);
  return { id, label, ...(fitz ? { fitzgerald: fitz } : {}), action: { type: 'speak' } };
}

function themeBoard(id: string, name: string, cols: number, labels: string[]): Board {
  const cells = labels.map((label, i) => themed(`${id}-${i}`, label));
  return {
    id,
    name,
    grid: { rows: Math.ceil(cells.length / cols), cols },
    cells: Object.fromEntries(cells.map((c) => [c.id, c])),
    placements: cells.map((c, i) => ({ cellId: c.id, row: Math.floor(i / cols), col: i % cols })),
  };
}

const MORNING_BOARD = themeBoard('tpl-morning', 'בוקר טוב', 4, [
  'אני', 'רוצה', 'לאכול', 'לשתות',
  'מים', 'חלב', 'לחם', 'ביצה',
  'כן', 'לא', 'בבקשה', 'עוד',
]);
const DRINKS_BOARD = themeBoard('tpl-drinks', 'שתייה', 3, [
  'מים', 'חלב', 'מיץ',
  'רוצה', 'עוד', 'בבקשה',
  'חם', 'קר', 'תודה',
]);
const WANT_BOARD = themeBoard('tpl-want', 'מה אני רוצה', 4, [
  'אני', 'רוצה', 'לשחק', 'עזרה',
  'בבקשה', 'תודה', 'כן', 'לא',
  'עוד', 'סיימתי', 'אוכל', 'מים',
]);
const HOME_THEME_BOARD = themeBoard('tpl-home', 'בית', 3, [
  'בית', 'אמא', 'אבא',
  'מיטה', 'מטבח', 'חדר',
  'לישון', 'לשחק', 'רוצה',
]);
const GAMES_BOARD = themeBoard('tpl-games', 'משחקים', 3, [
  'לשחק', 'כדור', 'ספר',
  'רוצה', 'עוד', 'יחד',
  'אני', 'כן', 'לא',
]);

const TEMPLATES: BoardTemplate[] = [
  {
    id: 'core4x4',
    nameHe: 'מילות ליבה (4×4)',
    description: 'לוח מילות ליבה עם ניווט לקטגוריות — מומלץ למתחילים',
    board: CORE4X4_BOARD,
  },
  {
    id: 'pecs6x3',
    nameHe: 'PECS בסיסי (6×3)',
    description: 'לוח תקשורת בסיסי בשיטת PECS — 18 תאים',
    board: PECS6X3_BOARD,
  },
  {
    id: 'feelings3x3',
    nameHe: 'רגשות (3×3)',
    description: 'לוח רגשות פשוט — מתאים לתחילת עבודה על ביטוי רגשי',
    board: FEELINGS3X3_BOARD,
  },
  {
    id: 'blank4x4',
    nameHe: 'לוח ריק (4×4)',
    description: 'לוח ריק לבנייה אישית מאפס',
    board: BLANK4X4_BOARD,
  },
  {
    id: 'core6x4',
    nameHe: 'אוצר ליבה — בינוני (6×4)',
    description: '24 מילות ליבה לרמה בינונית',
    board: CORE_VOCAB_6X4_BOARD,
  },
  {
    id: 'core6x6',
    nameHe: 'אוצר ליבה — מתקדם (6×6)',
    description: '36 מילות ליבה לרמה מתקדמת',
    board: CORE_VOCAB_6X6_BOARD,
  },
  {
    id: 'feelings6x4',
    nameHe: 'רגשות (6×4)',
    description: '24 תאי רגש ומצב נפשי',
    board: FEELINGS_6X4_BOARD,
  },
  // ── תבניות נושאיות (F5) ──
  {
    id: 'morning',
    nameHe: 'בוקר טוב (3×4)',
    description: 'שגרת בוקר — אכילה, שתייה ומילות ליבה',
    board: MORNING_BOARD,
  },
  {
    id: 'drinks',
    nameHe: 'שתייה (3×3)',
    description: 'בחירת משקה — מים, חלב, מיץ, חם/קר',
    board: DRINKS_BOARD,
  },
  {
    id: 'want',
    nameHe: 'מה אני רוצה (3×4)',
    description: 'בקשות נפוצות עם מילות ליבה',
    board: WANT_BOARD,
  },
  {
    id: 'home',
    nameHe: 'בית (3×3)',
    description: 'אוצר מילים של הבית והמשפחה',
    board: HOME_THEME_BOARD,
  },
  {
    id: 'games',
    nameHe: 'משחקים (3×3)',
    description: 'משחק ופנאי',
    board: GAMES_BOARD,
  },
];

export function listTemplates(): BoardTemplate[] {
  return TEMPLATES;
}

export function getTemplate(id: string): BoardTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
