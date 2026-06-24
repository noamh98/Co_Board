// Open Board Format (OBF) import/export — FR-035 (PRD §4.8, Phase 2).
// Spec: https://www.openboardformat.org/
// Maps between internal Board model and the OBF v0.9+ schema.

import type { Board, Cell, CellAction, Fitzgerald } from '../../domain/models';

// ---------------------------------------------------------------------------
// OBF types (subset of spec needed for round-trip)
// ---------------------------------------------------------------------------

export interface OBFButton {
  id: string;
  label: string;
  vocalization?: string;
  background_color?: string;
  border_color?: string;
  image_id?: string;
  load_board?: { id: string };
  hidden?: boolean;
  /** Non-spec extension — round-trip core/fitzgerald data. */
  ext_co_board?: {
    isCore?: boolean;
    fitzgerald?: Fitzgerald;
    nikud?: string;
    action?: string;
    symbolId?: string;
    imageUri?: string;
  };
}

export interface OBFGrid {
  rows: number;
  columns: number;
  order: (string | null)[][];
}

export interface OBFBoard {
  format: 'open-board-0.1';
  id: string;
  name: string;
  grid: OBFGrid;
  buttons: OBFButton[];
}

// ---------------------------------------------------------------------------
// Fitzgerald → background color (Modified Fitzgerald key, PRD §6.3)
// ---------------------------------------------------------------------------

const FITZGERALD_COLORS: Record<Fitzgerald, string> = {
  pronoun:     'rgb(255,255,0)',
  verb:        'rgb(0,128,0)',
  noun:        'rgb(255,165,0)',
  adjective:   'rgb(0,0,255)',
  preposition: 'rgb(255,0,255)',
  question:    'rgb(128,0,128)',
  negation:    'rgb(255,0,0)',
  social:      'rgb(255,20,147)',
  conjunction: 'rgb(244,244,240)',
  adverb:      'rgb(214,191,160)',
  determiner:  'rgb(200,203,211)',
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function exportToOBF(board: Board): OBFBoard {
  const buttons: OBFButton[] = Object.values(board.cells).map((cell) => {
    const btn: OBFButton = {
      id: cell.id,
      label: cell.label,
    };

    if (cell.vocalization) btn.vocalization = cell.vocalization;
    if (cell.fitzgerald) btn.background_color = FITZGERALD_COLORS[cell.fitzgerald];
    if (cell.hidden) btn.hidden = true;

    if (cell.action.type === 'navigate') {
      btn.load_board = { id: cell.action.targetBoardId };
    }

    // Store Co_Board-specific fields in extension namespace so round-trip is lossless.
    const ext: OBFButton['ext_co_board'] = {};
    if (cell.isCore) ext.isCore = true;
    if (cell.fitzgerald) ext.fitzgerald = cell.fitzgerald;
    if (cell.nikud) ext.nikud = cell.nikud;
    if (cell.action.type !== 'navigate') ext.action = cell.action.type;
    if (cell.symbolId) ext.symbolId = cell.symbolId;
    if (cell.imageUri) ext.imageUri = cell.imageUri;
    if (Object.keys(ext).length > 0) btn.ext_co_board = ext;

    return btn;
  });

  // Build grid order matrix from placements.
  const order: (string | null)[][] = Array.from({ length: board.grid.rows }, () =>
    Array<string | null>(board.grid.cols).fill(null),
  );
  for (const p of board.placements) {
    if (p.row < board.grid.rows && p.col < board.grid.cols) {
      order[p.row][p.col] = p.cellId;
    }
  }

  return {
    format: 'open-board-0.1',
    id: board.id,
    name: board.name,
    grid: { rows: board.grid.rows, columns: board.grid.cols, order },
    buttons,
  };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export class InvalidOBFError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidOBFError';
  }
}

function parseAction(btn: OBFButton): CellAction {
  if (btn.load_board?.id) return { type: 'navigate', targetBoardId: btn.load_board.id };
  const raw = btn.ext_co_board?.action;
  if (raw === 'back') return { type: 'back' };
  if (raw === 'home') return { type: 'home' };
  if (raw === 'clear') return { type: 'clear' };
  if (raw === 'deleteWord') return { type: 'deleteWord' };
  return { type: 'speak' };
}

export function importFromOBF(obf: OBFBoard): Board {
  if (!obf || obf.format !== 'open-board-0.1') {
    throw new InvalidOBFError('חסר שדה format: open-board-0.1');
  }
  if (!obf.id || !obf.name) {
    throw new InvalidOBFError('חסרים שדות חובה: id, name');
  }
  if (!obf.grid || !Array.isArray(obf.buttons)) {
    throw new InvalidOBFError('חסרים שדות grid / buttons');
  }

  const cells: Record<string, Cell> = {};
  for (const btn of obf.buttons) {
    const ext = btn.ext_co_board ?? {};
    const cell: Cell = {
      id: btn.id,
      label: btn.label,
      action: parseAction(btn),
    };
    if (btn.vocalization) cell.vocalization = btn.vocalization;
    if (ext.fitzgerald) cell.fitzgerald = ext.fitzgerald;
    if (ext.nikud) cell.nikud = ext.nikud;
    if (ext.isCore) cell.isCore = true;
    if (btn.hidden) cell.hidden = true;
    if (ext.symbolId) cell.symbolId = ext.symbolId;
    if (ext.imageUri) cell.imageUri = ext.imageUri;
    cells[cell.id] = cell;
  }

  const placements = obf.grid.order.flatMap((row, r) =>
    row
      .map((cellId, c) => (cellId ? { cellId, row: r, col: c } : null))
      .filter((p): p is NonNullable<typeof p> => p !== null),
  );

  return {
    id: crypto.randomUUID(),
    name: obf.name,
    grid: { rows: obf.grid.rows, cols: obf.grid.columns },
    cells,
    placements,
  };
}
