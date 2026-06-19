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
    fireEvent.click(screen.getByRole('button', { name: 'פרופיל חדש' }));
    fireEvent.change(screen.getByLabelText('שם פרופיל חדש'), {
      target: { value: 'דנה' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'הוסף' }));

    await waitFor(() =>
      expect(select.selectedOptions[0]?.textContent).toBe('דנה'),
    );
  });
});
