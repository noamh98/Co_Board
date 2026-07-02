import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { App } from './App';
import { resetDbForTests } from './data/db';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

// MVP: השחרור עבר ל"לחיצה ארוכה על המנעול" (בלי PIN). חלופת-מקלדת נגישה: Enter בהחזקה.
// העזר משחרר באמצעות החזקת Enter על כפתור המנעול + קידום טיימרים מדומה.
async function unlockViaLongPress(): Promise<void> {
  const lock = screen.getByRole('button', {
    name: 'שחרור למצב עריכה (לחיצה ארוכה)',
  });
  vi.useFakeTimers();
  try {
    fireEvent.keyDown(lock, { key: 'Enter' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    fireEvent.keyUp(lock, { key: 'Enter' });
  } finally {
    vi.useRealTimers();
  }
}

describe('App — פרוסה אנכית (domain → services → UI)', () => {
  it('טוען לוח מה-DB ומוסיף מילים לשורת המשפט בלחיצה', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'אני' }));
    fireEvent.click(screen.getByRole('button', { name: 'רוצה' }));
    const text = screen.getByTestId('sentence-text').textContent ?? '';
    expect(text).toContain('אני');
    expect(text).toContain('רוצה');
  });

  it('מחיקת מילה מעדכנת את שורת המשפט', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'אני' }));
    fireEvent.click(screen.getByRole('button', { name: 'מחיקת המילה האחרונה' }));
    expect(screen.getByTestId('sentence-text').textContent).toBe('');
  });
});

describe('App — מצב נעול, שחרור בלחיצה-ארוכה ומעבר פרופיל (MVP)', () => {
  it('נעול כברירת מחדל: אין בורר פרופיל, יש מנעול לשחרור', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    expect(screen.queryByLabelText('פרופיל')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'שחרור למצב עריכה (לחיצה ארוכה)' }),
    ).toBeInTheDocument();
  });

  it('לחיצה ארוכה על המנעול פותחת את מצב העריכה (ספריית לוחות) — בלי PIN', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });

    // לחיצה קצרה (שחרור מוקדם) לא פותחת
    const lock = screen.getByRole('button', {
      name: 'שחרור למצב עריכה (לחיצה ארוכה)',
    });
    vi.useFakeTimers();
    fireEvent.keyDown(lock, { key: 'Enter' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    fireEvent.keyUp(lock, { key: 'Enter' });
    vi.useRealTimers();
    expect(screen.queryByRole('region', { name: 'ספריית לוחות' })).toBeNull();

    // לחיצה ארוכה פותחת את הספרייה
    await unlockViaLongPress();
    expect(
      await screen.findByRole('region', { name: 'ספריית לוחות' }),
    ).toBeInTheDocument();
  });

  it('יצירת פרופיל חדש (מתוך ההגדרות) מחליפה את הפרופיל הפעיל', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    await unlockViaLongPress();

    // הניהול עבר להגדרות — פותחים את גלגל ההגדרות
    fireEvent.click(await screen.findByRole('button', { name: 'הגדרות' }));
    await screen.findByLabelText('פרופיל');

    // "פרופיל חדש" פותח את ה-Wizard (נטען lazily) — ממתינים לטעינת ה-chunk
    fireEvent.click(screen.getByRole('button', { name: 'פרופיל חדש' }));
    fireEvent.change(await screen.findByLabelText('שם הפרופיל'), {
      target: { value: 'דנה' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'הבא' }));
    fireEvent.click(screen.getByRole('button', { name: 'הבא' }));
    fireEvent.click(screen.getByRole('button', { name: 'צור פרופיל' }));

    // R6 (openPanel יחיד): ה-wizard סוגר את ההגדרות בזמן שהוא פתוח ומחזיר אליהן
    // בסיום — הבורר נטען מחדש (DOM node חדש), לכן שולפים אותו מחדש ולא משתמשים
    // בהפניה שנשמרה לפני פתיחת ה-wizard.
    await waitFor(() => {
      const select = screen.getByLabelText('פרופיל') as HTMLSelectElement;
      expect(select.selectedOptions[0]?.textContent).toBe('דנה');
    });
  });
});

describe('App — ניווט בין לוחות M2 (FR-013)', () => {
  it('כפתורי ניווט בית/חזור מוצגים תמיד', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    expect(screen.getByRole('button', { name: 'בית' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'חזור' })).toBeInTheDocument();
  });

  it('"חזור" מושבת בלוח הבית (אין היסטוריה)', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    const backBtn = screen.getByRole('button', { name: 'חזור' });
    expect(backBtn).toBeDisabled();
  });

  it('ניווט ללוח קטגוריה: לחיצת "אוכל" מציגה לוח אוכל', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    fireEvent.click(screen.getByRole('button', { name: 'אוכל' }));
    await screen.findByRole('button', { name: 'מים' });
    expect(screen.getByRole('button', { name: 'בננה' })).toBeInTheDocument();
  });

  it('ניווט ± חזרה: חזרה לבית לאחר כניסה ללוח אוכל', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    fireEvent.click(screen.getByRole('button', { name: 'אוכל' }));
    await screen.findByRole('button', { name: 'מים' });

    const backBtn = screen.getByRole('button', { name: 'חזור' });
    expect(backBtn).not.toBeDisabled();
    fireEvent.click(backBtn);

    await screen.findByRole('button', { name: 'אני' });
    expect(screen.queryByRole('button', { name: 'מים' })).toBeNull();
  });

  it('כפתור "בית" מחזיר ישירות ללוח הבית מכל עומק', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    fireEvent.click(screen.getByRole('button', { name: 'אוכל' }));
    await screen.findByRole('button', { name: 'מים' });

    fireEvent.click(screen.getByRole('button', { name: 'בית' }));
    await screen.findByRole('button', { name: 'אני' });
    expect(screen.queryByRole('button', { name: 'מים' })).toBeNull();
  });

  it('"חזור" לא מוסיף מילה לשורת המשפט (מניעת באג TouchChat)', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    fireEvent.click(screen.getByRole('button', { name: 'אוכל' }));
    await screen.findByRole('button', { name: 'מים' });

    fireEvent.click(screen.getByRole('button', { name: 'חזור' }));
    await screen.findByRole('button', { name: 'אני' });

    expect(screen.getByTestId('sentence-text').textContent).toBe('');
  });

  it('תאי speak בלוח קטגוריה מתווספים לשורת המשפט', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    fireEvent.click(screen.getByRole('button', { name: 'אוכל' }));
    fireEvent.click(await screen.findByRole('button', { name: 'מים' }));
    const text = screen.getByTestId('sentence-text').textContent ?? '';
    expect(text).toContain('מים');
  });

  it('מחסנית ניווט: ניווט עמוק + חזרות מרובות חוזרות לבית', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    fireEvent.click(screen.getByRole('button', { name: 'אוכל' }));
    await screen.findByRole('button', { name: 'מים' });

    const backBtn = screen.getByRole('button', { name: 'חזור' });
    fireEvent.click(backBtn);
    await screen.findByRole('button', { name: 'אני' });
    expect(screen.getByRole('button', { name: 'חזור' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'חזור' })); // no-op
    expect(screen.getByRole('button', { name: 'אני' })).toBeInTheDocument();
  });
});
