import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from './App';

describe('App — פרוסה אנכית (domain → services → UI)', () => {
  it('מרנדר לוח ליבה ומוסיף מילים לשורת המשפט בלחיצה', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'אני' }));
    fireEvent.click(screen.getByRole('button', { name: 'רוצה' }));
    const text = screen.getByTestId('sentence-text').textContent ?? '';
    expect(text).toContain('אני');
    expect(text).toContain('רוצה');
  });

  it('מחיקת מילה ונקה הכל מעדכנים את שורת המשפט', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'אני' }));
    fireEvent.click(screen.getByRole('button', { name: 'מחק מילה' }));
    expect(screen.getByTestId('sentence-text').textContent).toBe('');
  });
});
