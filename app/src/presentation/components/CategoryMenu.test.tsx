import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryMenu } from './CategoryMenu';
import type { Board } from '../../domain/models';

function makeBoard(id: string, name: string): Board {
  return { id, name, grid: { rows: 1, cols: 1 }, cells: {}, placements: [] };
}

const boards = [makeBoard('home', 'בית'), makeBoard('food', 'אוכל')];

describe('CategoryMenu — C-16 סגירה ב-Escape', () => {
  it('לחיצת Escape קוראת onClose', () => {
    const onClose = vi.fn();
    render(
      <CategoryMenu boards={boards} homeId="home" onSelect={() => {}} onClose={onClose} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('מקש אחר אינו סוגר את התפריט', () => {
    const onClose = vi.fn();
    render(
      <CategoryMenu boards={boards} homeId="home" onSelect={() => {}} onClose={onClose} />,
    );
    fireEvent.keyDown(document, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('כפתור הסגירה קורא onClose', () => {
    const onClose = vi.fn();
    render(
      <CategoryMenu boards={boards} homeId="home" onSelect={() => {}} onClose={onClose} />,
    );
    fireEvent.click(screen.getByLabelText('סגור'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('בחירת לוח קוראת onSelect עם המזהה', () => {
    const onSelect = vi.fn();
    render(
      <CategoryMenu boards={boards} homeId="home" onSelect={onSelect} onClose={() => {}} />,
    );
    fireEvent.click(screen.getByText(/אוכל/));
    expect(onSelect).toHaveBeenCalledWith('food');
  });

  it('מסיר את מאזין המקלדת בעת unmount (Escape לאחר סגירה אינו קורא onClose)', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <CategoryMenu boards={boards} homeId="home" onSelect={() => {}} onClose={onClose} />,
    );
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
