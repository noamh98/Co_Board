import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewBoardChooser } from './NewBoardChooser';

// F1: משפך כניסה אחיד — 3 מסלולים, AI מסומן כמומלץ (hero).

describe('NewBoardChooser', () => {
  it('מציג שלושה מסלולים; AI מסומן מומלץ', () => {
    render(<NewBoardChooser onChoose={vi.fn()} />);
    expect(screen.getByText('בחירה מתבנית')).toBeInTheDocument();
    expect(screen.getByText('יצירה מאפס')).toBeInTheDocument();
    expect(screen.getByText('יצירה עם AI')).toBeInTheDocument();
    expect(screen.getByText('מומלץ')).toBeInTheDocument();
  });

  it('מחזיר את המסלול שנבחר', () => {
    const onChoose = vi.fn();
    render(<NewBoardChooser onChoose={onChoose} />);
    fireEvent.click(screen.getByText('יצירה עם AI'));
    expect(onChoose).toHaveBeenCalledWith('ai');
    fireEvent.click(screen.getByText('בחירה מתבנית'));
    expect(onChoose).toHaveBeenCalledWith('template');
  });
});
