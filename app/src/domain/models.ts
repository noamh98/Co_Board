// מודל הנתונים המרכזי (Domain). מקור-האמת: PRD §4, §6.3.
// אינווריאנט קריטי (HANDOFF §4): מילות ליבה (isCore) לא זזות ממיקומן — ראה layout.ts.

/** קטגוריות מפתח פיצג'רלד המשודרג (Modified Fitzgerald) — PRD §6.3. */
export type Fitzgerald =
  | 'pronoun'     // אנשים / כינויי גוף — צהוב
  | 'verb'        // פעלים — ירוק
  | 'noun'        // שמות עצם — כתום
  | 'adjective'   // תארים — כחול
  | 'preposition' // מילות יחס ומיקום — ורוד
  | 'question'    // מילות שאלה — סגול
  | 'negation'    // שלילה / חירום — אדום
  | 'social'      // מילים חברתיות / ברכות — מג'נטה
  | 'conjunction' // מילות קישור (ו, אבל, כי, או) — לבן/אופוויט
  | 'adverb'      // תארי פועל (עכשיו, מהר, כאן) — חום רך
  | 'determiner'; // מיידעים/כמתים (כל, הרבה, כמה) — אפור

/** פעולת תא בלחיצה. */
export type CellAction =
  | { type: 'speak' } // הוספה לשורת המשפט + הקראת המילה
  | { type: 'navigate'; targetBoardId: string } // קפיצה ללוח אחר
  | { type: 'back' }
  | { type: 'home' }
  | { type: 'clear' } // נקה הכל
  | { type: 'deleteWord' }; // מחק מילה אחרונה

/** תא בודד בלוח. */
export interface Cell {
  id: string;
  /** הטקסט הגלוי על התא. */
  label: string;
  /**
   * טקסט להקראה אם שונה מה-label.
   * אם קיים `nikud` (override ידני) — הוא קודם בעדיפות (ראה nikudService).
   */
  vocalization?: string;
  /** ניקוד ידני שנשמר לתא (override). אינווריאנט: נשמר מקומית, ללא תלות ברשת. */
  nikud?: string;
  fitzgerald?: Fitzgerald;
  /** מזהה סמל מספריית סמלים (ARASAAC וכו'). */
  symbolId?: string;
  /** URI לתמונה אישית (מצלמה/גלריה). */
  imageUri?: string;
  /** הסתרה ללא מחיקה — לחשיפה הדרגתית (PRD §4.1, FR-014). */
  hidden?: boolean;
  /** מילת ליבה — כפופה לאינווריאנט עקביות המיקום (Motor Planning). */
  isCore?: boolean;
  action: CellAction;
}

export interface GridSize {
  rows: number;
  cols: number;
}

/** מיקום תא בגריד (0-based). ב-RTL, col=0 הוא העמודה הימנית ביותר. */
export interface CellPlacement {
  cellId: string;
  row: number;
  col: number;
}

export interface Board {
  id: string;
  name: string;
  grid: GridSize;
  /** מילון התאים: cellId → Cell. */
  cells: Record<string, Cell>;
  /** מיקום כל תא בגריד. */
  placements: CellPlacement[];
  /** לוח ליבה מקורי — לא נדרס בשכפול (PRD §4.1 edge case). */
  isCoreBoard?: boolean;
  /** ארכוב במקום מחיקה — נשמר לשחזור (PRD §4.5 edge case, FR-022). */
  archived?: boolean;
}

export type Role = 'child' | 'parent' | 'clinician' | 'staff';

/** הרשאות לפי תפקיד (RBAC, FR-027). */
export const ROLE_CAN_EDIT: Record<Role, boolean> = {
  child: false,
  parent: true,
  clinician: true,
  staff: false,
};

/** העדפות משתמש לפרופיל ילד — FR-001, 2B. */
export interface ProfilePreferences {
  /** גודל גריד מועדף (ברירת מחדל: הגריד הנוכחי). */
  preferredGridSize?: GridSize;
  /** קול ברירת מחדל לפרופיל. */
  defaultVoice?: 'child' | 'male' | 'female';
  /** רמת עומס ויזואלי — minimal/standard/rich. */
  visualLoadLevel?: 'minimal' | 'standard' | 'rich';
  /** מזהי מילים פעילות (מסנן activeWordIds). */
  activeWordIds?: string[];
}

export interface Profile {
  id: string;
  name: string;
  age?: number;
  defaultVoice?: 'child' | 'male' | 'female';
  /** לוח הבית של הפרופיל. */
  homeBoardId: string;
  /** מצב ילד נעול (Guided Access) — ברירת מחדל אמת לבטיחות (PRD §4.7). */
  locked: boolean;
  /** ארכוב במקום מחיקה — מעבר/מחיקת פרופיל שומרים גיבוי (PRD §4.5 edge case). */
  archived?: boolean;
  /** העדפות לפרופיל הילד — FR-001. */
  preferences?: ProfilePreferences;
  /** מזהה ילד בענן — Firestore children/{childId} — 2B. */
  childId?: string;
}
