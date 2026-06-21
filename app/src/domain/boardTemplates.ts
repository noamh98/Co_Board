import type { Board, Cell, Fitzgerald } from './models';
import { HOME_BOARD } from './boardLibrary';

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
];

export function listTemplates(): BoardTemplate[] {
  return TEMPLATES;
}

export function getTemplate(id: string): BoardTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
