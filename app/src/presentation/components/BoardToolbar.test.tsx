import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoardToolbar } from './BoardToolbar';

// F6: סרגל-לוח בן 5 כפתורים. נגישות: aria-label לכל כפתור; כפתורים מושבתים כשאין משפט.

function setup(words: string[] = []) {
  const handlers = {
    onPrint: vi.fn(),
    onSpeak: vi.fn(),
    onDeleteWord: vi.fn(),
    onClear: vi.fn(),
    onHome: vi.fn(),
  };
  render(<BoardToolbar words={words} {...handlers} />);
  return handlers;
}

describe('BoardToolbar', () => {
  it('מציג חמישה כפתורים עם aria-label עברי', () => {
    setup();
    expect(screen.getByLabelText('הדפסה / שמירה כ-PDF')).toBeInTheDocument();
    expect(screen.getByLabelText('השמעת המשפט')).toBeInTheDocument();
    expect(screen.getByLabelText('מחיקת המילה האחרונה')).toBeInTheDocument();
    expect(screen.getByLabelText('ניקוי כל המשפט')).toBeInTheDocument();
    expect(screen.getByLabelText('חזרה ללוח הבית')).toBeInTheDocument();
  });

  it('כפתורי השמעה/מחיקה/ניקוי מושבתים כשהמשפט ריק', () => {
    setup([]);
    expect(screen.getByLabelText('השמעת המשפט')).toBeDisabled();
    expect(screen.getByLabelText('מחיקת המילה האחרונה')).toBeDisabled();
    expect(screen.getByLabelText('ניקוי כל המשפט')).toBeDisabled();
  });

  it('מפעיל את ה-handlers בלחיצה כשיש מילים', () => {
    const h = setup(['אני', 'רוצה']);
    fireEvent.click(screen.getByLabelText('השמעת המשפט'));
    fireEvent.click(screen.getByLabelText('ניקוי כל המשפט'));
    fireEvent.click(screen.getByLabelText('הדפסה / שמירה כ-PDF'));
    expect(h.onSpeak).toHaveBeenCalledOnce();
    expect(h.onClear).toHaveBeenCalledOnce();
    expect(h.onPrint).toHaveBeenCalledOnce();
  });
});
