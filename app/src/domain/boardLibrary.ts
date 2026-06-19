// ספריית לוחות עבריים מוכנים — PRD §4.1 (FR-002). M2.
// לוחות לפי רמה (מתחילים/ביניים) וסביבה (אוכל/רגשות/משחק).
// אינווריאנט: מילות ליבה (isCore) במיקום קבוע (Motor Planning) — HANDOFF §4.
// RTL: col=0 = עמודה ימנית ביותר.

import type { Board, Cell, Fitzgerald } from './models';

function word(
  cellId: string,
  label: string,
  nikud: string,
  fitz: Fitzgerald,
  isCore = false,
): Cell {
  return {
    id: cellId,
    label,
    nikud,
    vocalization: nikud,
    fitzgerald: fitz,
    isCore,
    action: { type: 'speak' },
  };
}

function navCell(cellId: string, label: string, targetBoardId: string): Cell {
  return {
    id: cellId,
    label,
    fitzgerald: 'social',
    action: { type: 'navigate', targetBoardId },
  };
}

// ─── לוח בית V2 (4×4) ───────────────────────────────────────────────────────
// שורות 0–2, עמודות 0–2: 9 מילות ליבה (זהות ל-SAMPLE_CORE_BOARD לשמירת Motor Planning).
// עמודה 3: ניווט לקטגוריות.
// שורה 3: מילות ליבה נוספות.

export const HOME_BOARD_ID = 'home-board-v2';
export const FOOD_BOARD_ID = 'board-food';
export const EMOTIONS_BOARD_ID = 'board-emotions';
export const PLAY_BOARD_ID = 'board-play';

const homeCells: Cell[] = [
  // שורה 0
  word('h-i', 'אני', 'אֲנִי', 'pronoun', true),
  word('h-want', 'רוצה', 'רוֹצֶה', 'verb', true),
  word('h-more', 'עוד', 'עוֹד', 'adjective', true),
  navCell('h-nav-food', 'אוכל', FOOD_BOARD_ID),
  // שורה 1
  word('h-yes', 'כן', 'כֵּן', 'social', true),
  word('h-no', 'לא', 'לֹא', 'negation', true),
  word('h-eat', 'לאכול', 'לֶאֱכוֹל', 'verb', true),
  navCell('h-nav-emotions', 'רגשות', EMOTIONS_BOARD_ID),
  // שורה 2
  word('h-play', 'לשחק', 'לְשַׂחֵק', 'verb', true),
  word('h-help', 'עזרה', 'עֶזְרָה', 'negation', true),
  word('h-done', 'סיימתי', 'סִיַּמְתִּי', 'verb', true),
  navCell('h-nav-play', 'משחק', PLAY_BOARD_ID),
  // שורה 3
  word('h-please', 'בבקשה', 'בְּבַקָּשָׁה', 'social'),
  word('h-thanks', 'תודה', 'תּוֹדָה', 'social'),
  word('h-notwant', 'לא רוצה', 'לֹא רוֹצֶה', 'negation'),
  word('h-give', 'תן לי', 'תֵּן לִי', 'verb'),
];

export const HOME_BOARD: Board = {
  id: HOME_BOARD_ID,
  name: 'לוח בית — מתחילים',
  grid: { rows: 4, cols: 4 },
  isCoreBoard: true,
  cells: Object.fromEntries(homeCells.map((c) => [c.id, c])),
  placements: [
    // שורה 0 — ליבה + ניווט אוכל
    { cellId: 'h-i', row: 0, col: 0 },
    { cellId: 'h-want', row: 0, col: 1 },
    { cellId: 'h-more', row: 0, col: 2 },
    { cellId: 'h-nav-food', row: 0, col: 3 },
    // שורה 1 — ליבה + ניווט רגשות
    { cellId: 'h-yes', row: 1, col: 0 },
    { cellId: 'h-no', row: 1, col: 1 },
    { cellId: 'h-eat', row: 1, col: 2 },
    { cellId: 'h-nav-emotions', row: 1, col: 3 },
    // שורה 2 — ליבה + ניווט משחק
    { cellId: 'h-play', row: 2, col: 0 },
    { cellId: 'h-help', row: 2, col: 1 },
    { cellId: 'h-done', row: 2, col: 2 },
    { cellId: 'h-nav-play', row: 2, col: 3 },
    // שורה 3 — מילות ליבה נוספות
    { cellId: 'h-please', row: 3, col: 0 },
    { cellId: 'h-thanks', row: 3, col: 1 },
    { cellId: 'h-notwant', row: 3, col: 2 },
    { cellId: 'h-give', row: 3, col: 3 },
  ],
};

// ─── לוח אוכל (4×4) ──────────────────────────────────────────────────────────
const foodCells: Cell[] = [
  // שורה 0 — נוזלים + ליבה
  word('f-water', 'מים', 'מַיִם', 'noun'),
  word('f-milk', 'חלב', 'חָלָב', 'noun'),
  word('f-juice', 'מיץ', 'מִיץ', 'noun'),
  word('f-more', 'עוד', 'עוֹד', 'adjective', true),
  // שורה 1 — פירות
  word('f-banana', 'בננה', 'בַּנָנָה', 'noun'),
  word('f-apple', 'תפוח', 'תַּפּוּחַ', 'noun'),
  word('f-grape', 'ענבים', 'עֲנָבִים', 'noun'),
  word('f-orange', 'תפוז', 'תַּפּוּז', 'noun'),
  // שורה 2 — חטיפים/ארוחה
  word('f-bamba', 'במבה', 'בַּמְבָּה', 'noun'),
  word('f-bisli', 'ביסלי', 'בִּיסְלִי', 'noun'),
  word('f-bread', 'לחם', 'לֶחֶם', 'noun'),
  word('f-choc', 'שוקולד', 'שׁוֹקוֹלָד', 'noun'),
  // שורה 3 — פעלים + ליבה
  word('f-want', 'רוצה', 'רוֹצֶה', 'verb', true),
  word('f-eat', 'לאכול', 'לֶאֱכוֹל', 'verb', true),
  word('f-done', 'סיימתי', 'סִיַּמְתִּי', 'verb', true),
  word('f-no', 'לא', 'לֹא', 'negation', true),
];

export const FOOD_BOARD: Board = {
  id: FOOD_BOARD_ID,
  name: 'אוכל ושתייה',
  grid: { rows: 4, cols: 4 },
  cells: Object.fromEntries(foodCells.map((c) => [c.id, c])),
  placements: foodCells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 4),
    col: i % 4,
  })),
};

// ─── לוח רגשות (3×3) ─────────────────────────────────────────────────────────
const emotionCells: Cell[] = [
  word('e-happy', 'שמח', 'שָׂמֵחַ', 'adjective'),
  word('e-sad', 'עצוב', 'עָצוּב', 'adjective'),
  word('e-angry', 'כועס', 'כּוֹעֵס', 'adjective'),
  word('e-scared', 'מפחד', 'מְפַחֵד', 'adjective'),
  word('e-excited', 'נרגש', 'נִרְגָּשׁ', 'adjective'),
  word('e-tired', 'עייף', 'עָיֵף', 'adjective'),
  word('e-hurt', 'כואב', 'כּוֹאֵב', 'negation'),
  word('e-love', 'אוהב', 'אוֹהֵב', 'verb'),
  word('e-ok', 'בסדר', 'בְּסֵדֶר', 'social'),
];

export const EMOTIONS_BOARD: Board = {
  id: EMOTIONS_BOARD_ID,
  name: 'רגשות',
  grid: { rows: 3, cols: 3 },
  cells: Object.fromEntries(emotionCells.map((c) => [c.id, c])),
  placements: emotionCells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 3),
    col: i % 3,
  })),
};

// ─── לוח משחק (4×4) ──────────────────────────────────────────────────────────
const playCells: Cell[] = [
  // שורה 0 — צעצועים
  word('p-ball', 'כדור', 'כַּדּוּר', 'noun'),
  word('p-doll', 'בובה', 'בּוּבָּה', 'noun'),
  word('p-train', 'רכבת', 'רַכֶּבֶת', 'noun'),
  word('p-puzzle', 'פאזל', 'פַּאזֶל', 'noun'),
  // שורה 1 — פעולות משחק
  word('p-play', 'לשחק', 'לְשַׂחֵק', 'verb', true),
  word('p-run', 'לרוץ', 'לָרוּץ', 'verb'),
  word('p-build', 'לבנות', 'לִבְנוֹת', 'verb'),
  word('p-draw', 'לצייר', 'לְצַיֵּר', 'verb'),
  // שורה 2 — ספרים/מחשב
  word('p-book', 'ספר', 'סֵפֶר', 'noun'),
  word('p-computer', 'מחשב', 'מַחְשֵׁב', 'noun'),
  word('p-sand', 'חול', 'חוֹל', 'noun'),
  word('p-paint', 'צבע', 'צֶבַע', 'noun'),
  // שורה 3 — ליבה
  word('p-want', 'רוצה', 'רוֹצֶה', 'verb', true),
  word('p-more', 'עוד', 'עוֹד', 'adjective', true),
  word('p-done', 'סיימתי', 'סִיַּמְתִּי', 'verb', true),
  word('p-together', 'ביחד', 'בְּיַחַד', 'preposition'),
];

export const PLAY_BOARD: Board = {
  id: PLAY_BOARD_ID,
  name: 'משחק ופנאי',
  grid: { rows: 4, cols: 4 },
  cells: Object.fromEntries(playCells.map((c) => [c.id, c])),
  placements: playCells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 4),
    col: i % 4,
  })),
};

export const LIBRARY_BOARDS: Board[] = [
  HOME_BOARD,
  FOOD_BOARD,
  EMOTIONS_BOARD,
  PLAY_BOARD,
];

// פרופיל דמו M2 (homeBoardId מצביע ל-HOME_BOARD_V2).
export const DEMO_PROFILE_V2 = {
  id: 'demo',
  name: 'דמו',
  defaultVoice: 'child' as const,
  homeBoardId: HOME_BOARD_ID,
  locked: true,
};
