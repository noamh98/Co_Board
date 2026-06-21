import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { App } from './App';
import { resetDbForTests } from './data/db';
import { DEFAULT_PIN } from './domain/access';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

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
    fireEvent.click(screen.getByRole('button', { name: 'מחק מילה' }));
    expect(screen.getByTestId('sentence-text').textContent).toBe('');
  });
});

describe('App — מצב נעול, קוד מטפל ומעבר פרופיל (M1)', () => {
  it('נעול כברירת מחדל: אין בורר פרופיל, יש כפתור מצב מבוגר', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    expect(screen.queryByLabelText('פרופיל')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'מצב מבוגר' }),
    ).toBeInTheDocument();
  });

  it('קוד שגוי לא פותח; קוד נכון פותח מצב מבוגר עם בורר פרופיל', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    fireEvent.click(screen.getByRole('button', { name: 'מצב מבוגר' }));

    fireEvent.change(screen.getByLabelText('קוד מטפל'), {
      target: { value: '0000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'פתח' }));
    expect(screen.getByRole('alert')).toHaveTextContent('קוד שגוי');
    expect(screen.queryByLabelText('פרופיל')).toBeNull();

    fireEvent.change(screen.getByLabelText('קוד מטפל'), {
      target: { value: DEFAULT_PIN },
    });
    fireEvent.click(screen.getByRole('button', { name: 'פתח' }));
    expect(await screen.findByLabelText('פרופיל')).toBeInTheDocument();
  });

  it('יצירת פרופיל חדש מחליפה את הפרופיל הפעיל', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    fireEvent.click(screen.getByRole('button', { name: 'מצב מבוגר' }));
    fireEvent.change(screen.getByLabelText('קוד מטפל'), {
      target: { value: DEFAULT_PIN },
    });
    fireEvent.click(screen.getByRole('button', { name: 'פתח' }));

    const select = (await screen.findByLabelText(
      'פרופיל',
    )) as HTMLSelectElement;
    // פרופיל חדש פותח wizard — מילוי שלב 1, 2, 3
    fireEvent.click(screen.getByRole('button', { name: 'פרופיל חדש' }));
    fireEvent.change(screen.getByLabelText('שם הפרופיל'), {
      target: { value: 'דנה' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'הבא' }));
    // שלב 2 — תבנית ברירת מחדל (core4x4), לחץ הבא
    fireEvent.click(screen.getByRole('button', { name: 'הבא' }));
    // שלב 3 — אישור
    fireEvent.click(screen.getByRole('button', { name: 'צור פרופיל' }));

    await waitFor(() =>
      expect(select.selectedOptions[0]?.textContent).toBe('דנה'),
    );
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
    // לחץ על תא הניווט לאוכל
    fireEvent.click(screen.getByRole('button', { name: 'אוכל' }));
    // לוח האוכל מציג תאים ייחודיים לו
    await screen.findByRole('button', { name: 'מים' });
    expect(screen.getByRole('button', { name: 'בננה' })).toBeInTheDocument();
  });

  it('ניווט ± חזרה: חזרה לבית לאחר כניסה ללוח אוכל', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'אני' });
    fireEvent.click(screen.getByRole('button', { name: 'אוכל' }));
    await screen.findByRole('button', { name: 'מים' });

    // "חזור" פעיל כעת
    const backBtn = screen.getByRole('button', { name: 'חזור' });
    expect(backBtn).not.toBeDisabled();
    fireEvent.click(backBtn);

    // חזרה ללוח הבית
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

    // שורת המשפט ריקה — "חזור" לא נוסף
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

    // חזרה מרובה — לא אמורה לגרום לשגיאה
    const backBtn = screen.getByRole('button', { name: 'חזור' });
    fireEvent.click(backBtn);
    await screen.findByRole('button', { name: 'אני' });
    // חזרה נוספת מהבית — כפתור מושבת, ממשיך להיות בבית
    expect(screen.getByRole('button', { name: 'חזור' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'חזור' })); // no-op
    expect(screen.getByRole('button', { name: 'אני' })).toBeInTheDocument();
  });
});
