// ספריית לוחות עבריים מוכנים — PRD §4.1 (FR-002). M2.
// לוחות לפי רמה (מתחילים/ביניים) וסביבה (אוכל/רגשות/משחק).
// אינווריאנט: מילות ליבה (isCore) במיקום קבוע (Motor Planning) — HANDOFF §4.
// RTL: col=0 = עמודה ימנית ביותר.

import type { Board, Cell, Fitzgerald } from './models';
import { symbolIdFor, localSymbolPath } from './symbolMap';

function word(
  cellId: string,
  label: string,
  nikud: string,
  fitz: Fitzgerald,
  isCore = false,
): Cell {
  const sid = symbolIdFor(label);
  return {
    id: cellId,
    label,
    nikud,
    vocalization: nikud,
    fitzgerald: fitz,
    isCore,
    action: { type: 'speak' },
    // M20 — סמל ARASAAC מקומי לכל מילה עם מיפוי; חסר → label בלבד (fallback ב-CellButton).
    ...(sid !== undefined
      ? { symbolId: `arasaac:${sid}`, imageUri: localSymbolPath(sid) }
      : {}),
  };
}

function navCell(cellId: string, label: string, targetBoardId: string): Cell {
  const sid = symbolIdFor(label);
  return {
    id: cellId,
    label,
    fitzgerald: 'social',
    action: { type: 'navigate', targetBoardId },
    ...(sid !== undefined
      ? { symbolId: `arasaac:${sid}`, imageUri: localSymbolPath(sid) }
      : {}),
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

// ─── M14: IDs חדשים ────────────────────────────────────────────────────────────
export const PAIN_HEALTH_BOARD_ID = 'board-pain-health';
export const FAMILY_BOARD_ID = 'board-family';
export const SCHOOL_BOARD_ID = 'board-school';
export const CORE_VOCAB_6X4_BOARD_ID = 'board-core-vocab-6x4';
export const FEELINGS_6X4_BOARD_ID = 'board-feelings-6x4';
export const CORE_VOCAB_6X6_BOARD_ID = 'board-core-vocab-6x6';
export const DAILY_ROUTINE_6X6_BOARD_ID = 'board-daily-routine-6x6';

// ─── לוח כאב/בריאות (4×4) ───────────────────────────────────────────────────
// FR-002 §"כאב/בריאות" — אדום=כאב/חירום, כתום=גוף, ירוק=פעלים
const painHealthCells: Cell[] = [
  word('m14-ph-hurt',     'כואב לי',     'כּוֹאֵב לִי',        'negation'),
  word('m14-ph-belly',    'בטן',         'בֶּטֶן',             'noun'),
  word('m14-ph-head',     'ראש',         'רֹאשׁ',              'noun'),
  word('m14-ph-hand',     'יד',          'יָד',                'noun'),
  word('m14-ph-leg',      'רגל',         'רֶגֶל',              'noun'),
  word('m14-ph-hot',      'חם',          'חַם',                'adjective'),
  word('m14-ph-cold',     'קר',          'קַר',                'adjective'),
  word('m14-ph-tired',    'עייף',        'עָיֵף',              'adjective'),
  word('m14-ph-help',     'רוצה עזרה',   'רוֹצֶה עֶזְרָה',     'negation'),
  word('m14-ph-ok',       'בסדר',        'בְּסֵדֶר',           'social'),
  word('m14-ph-notok',    'לא בסדר',     'לֹא בְּסֵדֶר',       'negation'),
  word('m14-ph-doctor',   'רופא',        'רוֹפֵא',             'noun'),
  word('m14-ph-medicine', 'תרופה',       'תְּרוּפָה',          'noun'),
  word('m14-ph-water',    'מים',         'מַיִם',              'noun'),
  word('m14-ph-toilet',   'שירותים',     'שֵׁרוּתִים',         'noun'),
];

export const PAIN_HEALTH_BOARD: Board = {
  id: PAIN_HEALTH_BOARD_ID,
  name: 'כאב ובריאות',
  grid: { rows: 4, cols: 4 },
  cells: Object.fromEntries(painHealthCells.map((c) => [c.id, c])),
  placements: painHealthCells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 4),
    col: i % 4,
  })),
};

// ─── לוח משפחה (4×4) ─────────────────────────────────────────────────────────
const familyCells: Cell[] = [
  word('m14-fam-mom',      'אמא',        'אִמָּא',             'noun'),
  word('m14-fam-dad',      'אבא',        'אַבָּא',             'noun'),
  word('m14-fam-brother',  'אח',         'אָח',                'noun'),
  word('m14-fam-sister',   'אחות',       'אָחוֹת',             'noun'),
  word('m14-fam-grandpa',  'סבא',        'סַבָּא',             'noun'),
  word('m14-fam-grandma',  'סבתא',       'סַבְתָּא',           'noun'),
  word('m14-fam-baby',     'תינוק',      'תִּינוֹק',           'noun'),
  word('m14-fam-friend',   'חבר',        'חָבֵר',              'noun'),
  word('m14-fam-home',     'בית',        'בַּיִת',             'noun'),
  word('m14-fam-hi',       'שלום',       'שָׁלוֹם',            'social'),
  word('m14-fam-love',     'אהבה',       'אַהֲבָה',            'social'),
  word('m14-fam-hug',      'להתחבק',     'לְהִתְחַבֵּק',       'verb'),
  word('m14-fam-play',     'לשחק',       'לְשַׂחֵק',           'verb'),
  word('m14-fam-together', 'ביחד',       'בְּיַחַד',           'preposition'),
  word('m14-fam-go',       'ללכת',       'לָלֶכֶת',            'verb'),
];

export const FAMILY_BOARD: Board = {
  id: FAMILY_BOARD_ID,
  name: 'משפחה',
  grid: { rows: 4, cols: 4 },
  cells: Object.fromEntries(familyCells.map((c) => [c.id, c])),
  placements: familyCells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 4),
    col: i % 4,
  })),
};

// ─── לוח גן/בית ספר (4×4) ────────────────────────────────────────────────────
const schoolCells: Cell[] = [
  word('m14-sch-teacher', 'מורה',        'מוֹרָה',             'noun'),
  word('m14-sch-kinder',  'גננת',        'גַּנֶּנֶת',          'noun'),
  word('m14-sch-aide',    'סייעת',       'סַיֶּעֶת',           'noun'),
  word('m14-sch-boy',     'ילד',         'יֶלֶד',              'noun'),
  word('m14-sch-girl',    'ילדה',        'יַלְדָּה',           'noun'),
  word('m14-sch-book',    'ספר',         'סֵפֶר',              'noun'),
  word('m14-sch-pencil',  'עיפרון',      'עִפָּרוֹן',          'noun'),
  word('m14-sch-chair',   'כיסא',        'כִּסֵּא',            'noun'),
  word('m14-sch-table',   'שולחן',       'שֻׁלְחָן',           'noun'),
  word('m14-sch-draw',    'ציור',        'צִיּוּר',            'noun'),
  word('m14-sch-song',    'שיר',         'שִׁיר',              'noun'),
  word('m14-sch-meal',    'ארוחה',       'אֲרוּחָה',           'noun'),
  word('m14-sch-yard',    'חצר',         'חָצֵר',              'noun'),
  word('m14-sch-toilet',  'שירותים',     'שֵׁרוּתִים',         'noun'),
  word('m14-sch-help',    'עזרה',        'עֶזְרָה',            'negation'),
];

export const SCHOOL_BOARD: Board = {
  id: SCHOOL_BOARD_ID,
  name: 'גן ובית ספר',
  grid: { rows: 4, cols: 4 },
  cells: Object.fromEntries(schoolCells.map((c) => [c.id, c])),
  placements: schoolCells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 4),
    col: i % 4,
  })),
};

// ─── אוצר ליבה 6×4 (24 תאים) ────────────────────────────────────────────────
const coreVocab6x4Cells: Cell[] = [
  // שורה 0 — כינויים + רצון
  word('m14-cv4-i',       'אני',         'אֲנִי',              'pronoun',   true),
  word('m14-cv4-you',     'את/ה',        'אַת/ה',              'pronoun',   true),
  word('m14-cv4-he',      'הוא',         'הוּא',               'pronoun',   true),
  word('m14-cv4-she',     'היא',         'הִיא',               'pronoun',   true),
  word('m14-cv4-want',    'רוצה',        'רוֹצֶה',             'verb',      true),
  word('m14-cv4-notwant', 'לא רוצה',     'לֹא רוֹצֶה',         'negation',  true),
  // שורה 1 — יש/אין + כמות
  word('m14-cv4-have',    'יש',          'יֵשׁ',               'verb',      true),
  word('m14-cv4-nohave',  'אין',         'אֵין',               'negation',  true),
  word('m14-cv4-more',    'עוד',         'עוֹד',               'adjective', true),
  word('m14-cv4-done',    'סיים',        'סִיֵּם',             'verb',      true),
  word('m14-cv4-yes',     'כן',          'כֵּן',               'social',    true),
  word('m14-cv4-no',      'לא',          'לֹא',                'negation',  true),
  // שורה 2 — תארים + פעלים
  word('m14-cv4-big',     'גדול',        'גָּדוֹל',            'adjective', true),
  word('m14-cv4-small',   'קטן',         'קָטָן',              'adjective', true),
  word('m14-cv4-good',    'טוב',         'טוֹב',               'adjective', true),
  word('m14-cv4-bad',     'רע',          'רַע',                'adjective', true),
  word('m14-cv4-go',      'ללכת',        'לָלֶכֶת',            'verb',      true),
  word('m14-cv4-eat',     'לאכול',       'לֶאֱכוֹל',           'verb',      true),
  // שורה 3 — פעלים נוספים
  word('m14-cv4-drink',   'לשתות',       'לִשְׁתּוֹת',         'verb',      true),
  word('m14-cv4-sleep',   'לישון',       'לִישׁוֹן',           'verb',      true),
  word('m14-cv4-play',    'לשחק',        'לְשַׂחֵק',           'verb',      true),
  word('m14-cv4-see',     'לראות',       'לִרְאוֹת',           'verb',      true),
  word('m14-cv4-hear',    'לשמוע',       'לִשְׁמוֹעַ',         'verb',      true),
  word('m14-cv4-help',    'עזרה',        'עֶזְרָה',            'negation',  true),
];

export const CORE_VOCAB_6X4_BOARD: Board = {
  id: CORE_VOCAB_6X4_BOARD_ID,
  name: 'אוצר ליבה — בינוני',
  grid: { rows: 4, cols: 6 },
  isCoreBoard: true,
  cells: Object.fromEntries(coreVocab6x4Cells.map((c) => [c.id, c])),
  placements: coreVocab6x4Cells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 6),
    col: i % 6,
  })),
};

// ─── רגשות 6×4 (24 תאים) ────────────────────────────────────────────────────
const feelings6x4Cells: Cell[] = [
  // שורה 0
  word('m14-f6-happy',     'שמח',        'שָׂמֵחַ',            'adjective'),
  word('m14-f6-sad',       'עצוב',       'עָצוּב',             'adjective'),
  word('m14-f6-angry',     'כועס',       'כּוֹעֵס',            'adjective'),
  word('m14-f6-scared',    'פוחד',       'פּוֹחֵד',            'adjective'),
  word('m14-f6-excited',   'נרגש',       'נִרְגָּשׁ',          'adjective'),
  word('m14-f6-proud',     'גאה',        'גֵּאֶה',             'adjective'),
  // שורה 1
  word('m14-f6-confused',  'מבולבל',     'מְבֻלְבָּל',         'adjective'),
  word('m14-f6-tired',     'עייף',       'עָיֵף',              'adjective'),
  word('m14-f6-love',      'אוהב',       'אוֹהֵב',             'verb'),
  word('m14-f6-hate',      'שונא',       'שׂוֹנֵא',            'verb'),
  word('m14-f6-bored',     'משועמם',     'מְשׁוּעְמָם',        'adjective'),
  word('m14-f6-hurt',      'כואב',       'כּוֹאֵב',            'negation'),
  // שורה 2
  word('m14-f6-ok',        'בסדר',       'בְּסֵדֶר',           'social'),
  word('m14-f6-notok',     'לא בסדר',    'לֹא בְּסֵדֶר',       'negation'),
  word('m14-f6-want',      'רוצה',       'רוֹצֶה',             'verb'),
  word('m14-f6-notwant',   'לא רוצה',    'לֹא רוֹצֶה',         'negation'),
  word('m14-f6-together',  'ביחד',       'בְּיַחַד',           'preposition'),
  word('m14-f6-alone',     'לבד',        'לְבַד',              'adjective'),
  // שורה 3
  word('m14-f6-helping',   'עוזר',       'עוֹזֵר',             'verb'),
  word('m14-f6-bothering', 'מפריע',      'מַפְרִיעַ',          'verb'),
  word('m14-f6-hot',       'חם',         'חַם',                'adjective'),
  word('m14-f6-cold',      'קר',         'קַר',                'adjective'),
  word('m14-f6-loud',      'רועש',       'רוֹעֵשׁ',            'adjective'),
  word('m14-f6-quiet',     'שקט',        'שָׁקֵט',             'adjective'),
];

export const FEELINGS_6X4_BOARD: Board = {
  id: FEELINGS_6X4_BOARD_ID,
  name: 'רגשות — מורחב',
  grid: { rows: 4, cols: 6 },
  cells: Object.fromEntries(feelings6x4Cells.map((c) => [c.id, c])),
  placements: feelings6x4Cells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 6),
    col: i % 6,
  })),
};

// ─── אוצר ליבה 6×6 (36 תאים) ────────────────────────────────────────────────
const coreVocab6x6Cells: Cell[] = [
  // שורה 0 — כינויים
  word('m14-cv6-i',       'אני',         'אֲנִי',              'pronoun',   true),
  word('m14-cv6-you-f',   'את',          'אַתְּ',              'pronoun',   true),
  word('m14-cv6-he',      'הוא',         'הוּא',               'pronoun',   true),
  word('m14-cv6-she',     'היא',         'הִיא',               'pronoun',   true),
  word('m14-cv6-we',      'אנחנו',       'אֲנַחְנוּ',          'pronoun',   true),
  word('m14-cv6-you-pl',  'אתם',         'אַתֶּם',             'pronoun',   true),
  // שורה 1 — פעלים מרכזיים
  word('m14-cv6-want',    'רוצה',        'רוֹצֶה',             'verb',      true),
  word('m14-cv6-no',      'לא',          'לֹא',                'negation',  true),
  word('m14-cv6-have',    'יש',          'יֵשׁ',               'verb',      true),
  word('m14-cv6-nohave',  'אין',         'אֵין',               'negation',  true),
  word('m14-cv6-can',     'יכול',        'יָכוֹל',             'verb',      true),
  word('m14-cv6-need',    'צריך',        'צָרִיךְ',            'verb',      true),
  // שורה 2 — פעלים נוספים
  word('m14-cv6-go',      'ללכת',        'לָלֶכֶת',            'verb',      true),
  word('m14-cv6-eat',     'לאכול',       'לֶאֱכוֹל',           'verb',      true),
  word('m14-cv6-drink',   'לשתות',       'לִשְׁתּוֹת',         'verb',      true),
  word('m14-cv6-play',    'לשחק',        'לְשַׂחֵק',           'verb',      true),
  word('m14-cv6-read',    'לקרוא',       'לִקְרוֹא',           'verb',      true),
  word('m14-cv6-see',     'לראות',       'לִרְאוֹת',           'verb',      true),
  // שורה 3 — תארים וכמות
  word('m14-cv6-more',    'עוד',         'עוֹד',               'adjective', true),
  word('m14-cv6-done',    'סיים',        'סִיֵּם',             'verb',      true),
  word('m14-cv6-big',     'גדול',        'גָּדוֹל',            'adjective', true),
  word('m14-cv6-small',   'קטן',         'קָטָן',              'adjective', true),
  word('m14-cv6-good',    'טוב',         'טוֹב',               'adjective', true),
  word('m14-cv6-bad',     'רע',          'רַע',                'adjective', true),
  // שורה 4 — שאלות
  word('m14-cv6-what',    'מה',          'מָה',                'question',  true),
  word('m14-cv6-where',   'איפה',        'אֵיפֹה',             'question',  true),
  word('m14-cv6-who',     'מי',          'מִי',                'question',  true),
  word('m14-cv6-when',    'מתי',         'מָתַי',              'question',  true),
  word('m14-cv6-why',     'למה',         'לָמָּה',             'question',  true),
  word('m14-cv6-how',     'איך',         'אֵיךְ',              'question',  true),
  // שורה 5 — חברתי
  word('m14-cv6-hi',      'שלום',        'שָׁלוֹם',            'social',    true),
  word('m14-cv6-thanks',  'תודה',        'תּוֹדָה',            'social',    true),
  word('m14-cv6-please',  'בבקשה',       'בְּבַקָּשָׁה',       'social',    true),
  word('m14-cv6-sorry',   'סליחה',       'סְלִיחָה',           'social',    true),
  word('m14-cv6-yes',     'כן',          'כֵּן',               'social',    true),
  word('m14-cv6-no2',     'לא',          'לֹא',                'negation',  true),
];

export const CORE_VOCAB_6X6_BOARD: Board = {
  id: CORE_VOCAB_6X6_BOARD_ID,
  name: 'אוצר ליבה — מתקדם',
  grid: { rows: 6, cols: 6 },
  isCoreBoard: true,
  cells: Object.fromEntries(coreVocab6x6Cells.map((c) => [c.id, c])),
  placements: coreVocab6x6Cells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 6),
    col: i % 6,
  })),
};

// ─── שגרת יום 6×6 (36 תאים) ─────────────────────────────────────────────────
const dailyRoutineCells: Cell[] = [
  // שורה 0 — שגרת בוקר
  word('m14-dr-breakfast', 'ארוחת בוקר', 'אֲרוּחַת בֹּקֶר',   'noun'),
  word('m14-dr-dress',     'להתלבש',     'לְהִתְלַבֵּשׁ',      'verb'),
  word('m14-dr-teeth',     'שיניים',     'שִׁינַּיִם',         'noun'),
  word('m14-dr-bath',      'אמבטיה',     'אַמְבַּטְיָה',       'noun'),
  word('m14-dr-sleep',     'לישון',      'לִישׁוֹן',           'verb'),
  word('m14-dr-wakeup',    'להתעורר',    'לְהִתְעוֹרֵר',       'verb'),
  // שורה 1 — מקומות
  word('m14-dr-kinder',    'גן',         'גַּן',               'noun'),
  word('m14-dr-school',    'בית ספר',    'בֵּית סֵפֶר',        'noun'),
  word('m14-dr-therapy',   'טיפול',      'טִיפּוּל',           'noun'),
  word('m14-dr-library',   'ספרייה',     'סִפְרִיָּה',         'noun'),
  word('m14-dr-park',      'פארק',       'פַּארְק',            'noun'),
  word('m14-dr-market',    'סופרמרקט',   'סוּפֶּרְמַרְקֶט',   'noun'),
  // שורה 2 — פעילויות
  word('m14-dr-tv',        'טלוויזיה',   'טֶלֶוִיזְיָה',       'noun'),
  word('m14-dr-ipad',      'iPad',       'iPad',               'noun'),
  word('m14-dr-book',      'ספר',        'סֵפֶר',              'noun'),
  word('m14-dr-game',      'משחק',       'מִשְׂחָק',           'noun'),
  word('m14-dr-outside',   'חוץ',        'חוּץ',               'noun'),
  word('m14-dr-inside',    'פנים',       'פְּנִים',            'noun'),
  // שורה 3 — זמן
  word('m14-dr-morning',   'בוקר',       'בֹּקֶר',             'noun'),
  word('m14-dr-noon',      'צהריים',     'צָהֳרַיִם',          'noun'),
  word('m14-dr-evening',   'ערב',        'עֶרֶב',              'noun'),
  word('m14-dr-night',     'לילה',       'לַיְלָה',            'noun'),
  word('m14-dr-now',       'עכשיו',      'עַכְשָׁיו',          'adjective'),
  word('m14-dr-later',     'אחר כך',     'אַחַר כָּךְ',        'adjective'),
  // שורה 4 — פעולות
  word('m14-dr-eat',       'לאכול',      'לֶאֱכוֹל',           'verb'),
  word('m14-dr-drink',     'לשתות',      'לִשְׁתּוֹת',         'verb'),
  word('m14-dr-shower',    'להתרחץ',     'לְהִתְרַחֵץ',        'verb'),
  word('m14-dr-walk',      'ללכת',       'לָלֶכֶת',            'verb'),
  word('m14-dr-rest',      'לנוח',       'לָנוּחַ',            'verb'),
  word('m14-dr-play',      'לשחק',       'לְשַׂחֵק',           'verb'),
  // שורה 5 — אנשים
  word('m14-dr-helper',    'עוזר',       'עוֹזֵר',             'noun'),
  word('m14-dr-mom',       'אמא',        'אִמָּא',             'noun'),
  word('m14-dr-dad',       'אבא',        'אַבָּא',             'noun'),
  word('m14-dr-teacher',   'מורה',       'מוֹרָה',             'noun'),
  word('m14-dr-doctor',    'רופא',       'רוֹפֵא',             'noun'),
  word('m14-dr-friend',    'חבר',        'חָבֵר',              'noun'),
];

export const DAILY_ROUTINE_6X6_BOARD: Board = {
  id: DAILY_ROUTINE_6X6_BOARD_ID,
  name: 'שגרת יום',
  grid: { rows: 6, cols: 6 },
  cells: Object.fromEntries(dailyRoutineCells.map((c) => [c.id, c])),
  placements: dailyRoutineCells.map((c, i) => ({
    cellId: c.id,
    row: Math.floor(i / 6),
    col: i % 6,
  })),
};

// ─── ספריית לוחות מלאה ───────────────────────────────────────────────────────
export const BOARD_LIBRARY: Record<string, Board> = {
  [HOME_BOARD_ID]:               HOME_BOARD,
  [FOOD_BOARD_ID]:               FOOD_BOARD,
  [EMOTIONS_BOARD_ID]:           EMOTIONS_BOARD,
  [PLAY_BOARD_ID]:               PLAY_BOARD,
  [PAIN_HEALTH_BOARD_ID]:        PAIN_HEALTH_BOARD,
  [FAMILY_BOARD_ID]:             FAMILY_BOARD,
  [SCHOOL_BOARD_ID]:             SCHOOL_BOARD,
  [CORE_VOCAB_6X4_BOARD_ID]:     CORE_VOCAB_6X4_BOARD,
  [FEELINGS_6X4_BOARD_ID]:       FEELINGS_6X4_BOARD,
  [CORE_VOCAB_6X6_BOARD_ID]:     CORE_VOCAB_6X6_BOARD,
  [DAILY_ROUTINE_6X6_BOARD_ID]:  DAILY_ROUTINE_6X6_BOARD,
};

export function getBoardById(id: string): Board | undefined {
  return BOARD_LIBRARY[id];
}

export function listBoardLibrary(): Board[] {
  return Object.values(BOARD_LIBRARY);
}

export const LIBRARY_BOARDS: Board[] = listBoardLibrary();

// פרופיל דמו M2 (homeBoardId מצביע ל-HOME_BOARD_V2).
export const DEMO_PROFILE_V2 = {
  id: 'demo',
  name: 'דמו',
  defaultVoice: 'child' as const,
  homeBoardId: HOME_BOARD_ID,
  locked: true,
};
