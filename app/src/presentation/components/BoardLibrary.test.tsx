import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BoardLibrary, type BoardLibraryProps } from './BoardLibrary';
import type { Board } from '../../domain/models';

// שלב 3 — ספרייה: קיבוץ (שלי / תבנית), פתיחת לוח, "+ לוח חדש", ארכוב ב-editMode,
// כיווץ קבוצה (aria-expanded). מבחן התנהגות — לא צילום פיקסלים.

function board(id: string, name: string, opts: Partial<Board> = {}): Board {
  return {
    id,
    name,
    grid: { rows: 4, cols: 4 },
    cells: {},
    placements: [],
    ...opts,
  };
}

const BOARDS: Board[] = [
  board('home', 'לוח בית', { isCoreBoard: true }),
  board('core', 'אוצר ליבה', { isCoreBoard: true }),
  board('mine1', 'הבוקר שלי'),
  board('mine2', 'משחקים'),
];

function setup(overrides: Partial<BoardLibraryProps> = {}) {
  const props = {
    boards: BOARDS,
    homeId: 'home',
    editMode: false,
    onOpen: vi.fn(),
    onNew: vi.fn(),
    onArchive: vi.fn(),
    ...overrides,
  };
  render(<BoardLibrary {...props} />);
  return props;
}

describe('BoardLibrary', () => {
  it('מקבץ לוחות שלי מול לוחות תבנית', () => {
    setup();
    expect(screen.getByText('הלוחות שלי')).toBeInTheDocument();
    expect(screen.getByText('לוחות תבנית')).toBeInTheDocument();
  });

  it('לחיצה על כרטיס קוראת ל-onOpen עם מזהה הלוח', () => {
    const { onOpen } = setup();
    fireEvent.click(screen.getByRole('button', { name: /הבוקר שלי/ }));
    expect(onOpen).toHaveBeenCalledWith('mine1');
  });

  it('"+ לוח חדש" קורא ל-onNew', () => {
    const { onNew } = setup();
    fireEvent.click(screen.getByRole('button', { name: /לוח חדש/ }));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('מסמן את לוח הבית', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'לוח בית, 4 על 4, לוח בית' }),
    ).toBeInTheDocument();
  });

  it('ארכוב מוצג רק ב-editMode, ולא על לוח הבית/תבניות', () => {
    const { onArchive } = setup({ editMode: true });
    // לוח "שלי" שאינו בית — יש כפתור ארכוב
    const archiveBtns = screen.getAllByRole('button', { name: /העברה לארכיון/ });
    expect(archiveBtns).toHaveLength(2); // mine1, mine2 (לא home, לא core)
    fireEvent.click(screen.getByRole('button', { name: 'העברה לארכיון: הבוקר שלי' }));
    expect(onArchive).toHaveBeenCalledWith('mine1');
  });

  it('ללא editMode אין כפתורי ארכוב', () => {
    setup({ editMode: false });
    expect(screen.queryByRole('button', { name: /העברה לארכיון/ })).toBeNull();
  });

  it('כיווץ קבוצה מסתיר את הכרטיסים (aria-expanded)', () => {
    setup();
    const header = screen.getByRole('button', { name: /הלוחות שלי/ });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /הבוקר שלי/ })).toBeNull();
  });

  it('מצב ריק: הודעה מנחה כשאין לוחות', () => {
    setup({ boards: [] });
    expect(screen.getByText(/אין עדיין לוחות/)).toBeInTheDocument();
  });

  it('כרטיס תבנית פתיח אך ללא ארכוב גם ב-editMode', () => {
    setup({ editMode: true });
    const templatesGroup = screen.getByText('לוחות תבנית').closest('.library-group') as HTMLElement;
    // בקבוצת התבניות אין כפתורי ארכוב
    expect(within(templatesGroup).queryByRole('button', { name: /העברה לארכיון/ })).toBeNull();
  });
});
