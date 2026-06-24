// LoginPanel.test.tsx — בדיקות LoginPanel (2A: כניסה בלבד, ללא הרשמה ישירה).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPanel } from './LoginPanel';

describe('LoginPanel', () => {
  it('renders email + password + כניסה button', () => {
    render(<LoginPanel onSignIn={vi.fn()} />);
    expect(screen.getByLabelText('אימייל')).toBeTruthy();
    expect(screen.getByLabelText('סיסמה')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'כניסה' })).toBeTruthy();
  });

  it('כפתור כניסה disabled כשאין email/password', () => {
    render(<LoginPanel onSignIn={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'כניסה' })).toBeDisabled();
  });

  it('submit signIn קורא onSignIn', async () => {
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    render(<LoginPanel onSignIn={onSignIn} />);
    fireEvent.change(screen.getByLabelText('אימייל'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('סיסמה'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() => expect(onSignIn).toHaveBeenCalledWith('a@b.com', 'pass123'));
  });

  it('שגיאת סיסמה שגויה מציגה טקסט בעברית', async () => {
    const onSignIn = vi.fn().mockRejectedValue(new Error('auth/wrong-password'));
    render(<LoginPanel onSignIn={onSignIn} />);
    fireEvent.change(screen.getByLabelText('אימייל'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('סיסמה'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('סיסמה שגויה'),
    );
  });

  it('כפתור הרשמה מוצג עם onGoToRegister ולוחץ קורא אותו', () => {
    const onGoToRegister = vi.fn();
    render(<LoginPanel onSignIn={vi.fn()} onGoToRegister={onGoToRegister} />);
    const btn = screen.getByRole('button', { name: 'הרשמה' });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onGoToRegister).toHaveBeenCalledOnce();
  });

  it('כפתור Google מוצג עם onGoogleSignIn', () => {
    render(<LoginPanel onSignIn={vi.fn()} onGoogleSignIn={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'כניסה עם Google' })).toBeTruthy();
  });
});
