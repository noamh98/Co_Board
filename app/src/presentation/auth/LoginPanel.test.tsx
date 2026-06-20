import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPanel } from './LoginPanel';

describe('LoginPanel', () => {
  it('renders email + password + buttons', () => {
    render(<LoginPanel onSignIn={vi.fn()} onSignUp={vi.fn()} />);
    expect(screen.getByLabelText('אימייל')).toBeTruthy();
    expect(screen.getByLabelText('סיסמה')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'כניסה' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'הרשמה' })).toBeTruthy();
  });

  it('כפתורים disabled כשאין email/password', () => {
    render(<LoginPanel onSignIn={vi.fn()} onSignUp={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'כניסה' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'הרשמה' })).toBeDisabled();
  });

  it('submit signIn קורא onSignIn', async () => {
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    render(<LoginPanel onSignIn={onSignIn} onSignUp={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('אימייל'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('סיסמה'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() => expect(onSignIn).toHaveBeenCalledWith('a@b.com', 'pass123'));
  });

  it('שגיאת סיסמה שגויה מציגה טקסט בעברית', async () => {
    const onSignIn = vi.fn().mockRejectedValue(new Error('auth/wrong-password'));
    render(<LoginPanel onSignIn={onSignIn} onSignUp={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('אימייל'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('סיסמה'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('סיסמה שגויה'),
    );
  });

  it('הרשמה קוראת onSignUp', async () => {
    const onSignUp = vi.fn().mockResolvedValue(undefined);
    render(<LoginPanel onSignIn={vi.fn()} onSignUp={onSignUp} />);
    fireEvent.change(screen.getByLabelText('אימייל'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByLabelText('סיסמה'), { target: { value: 'secure123' } });
    fireEvent.click(screen.getByRole('button', { name: 'הרשמה' }));
    await waitFor(() => expect(onSignUp).toHaveBeenCalledWith('new@test.com', 'secure123'));
  });
});
