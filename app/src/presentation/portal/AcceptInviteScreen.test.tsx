// AcceptInviteScreen.test.tsx — זריעת קוד מ-deep-link למסך קבלת ההזמנה (3.1, B-07).
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AcceptInviteScreen } from './AcceptInviteScreen';

const VALID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'; // 32 תווי hex

function noop(): void {}

describe('portal/AcceptInviteScreen — deep-link prefill (B-07)', () => {
  it('initialCode תקין מזין את שדה הקלט ומפעיל את כפתור הקבלה', () => {
    render(<AcceptInviteScreen uid="u1" onAccepted={noop} onClose={noop} initialCode={VALID} />);
    const input = screen.getByLabelText('קוד שיתוף') as HTMLInputElement;
    expect(input.value).toBe(VALID);
    expect(screen.getByRole('button', { name: 'קבל גישה' })).toBeEnabled();
  });

  it('מסנן תווים לא-hex מ-initialCode', () => {
    render(
      <AcceptInviteScreen
        uid="u1"
        onAccepted={noop}
        onClose={noop}
        initialCode={`  ${VALID.toUpperCase()}-XYZ  `}
      />,
    );
    const input = screen.getByLabelText('קוד שיתוף') as HTMLInputElement;
    expect(input.value).toBe(VALID);
  });

  it('ללא initialCode השדה ריק וכפתור הקבלה מושבת', () => {
    render(<AcceptInviteScreen uid="u1" onAccepted={noop} onClose={noop} />);
    const input = screen.getByLabelText('קוד שיתוף') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(screen.getByRole('button', { name: 'קבל גישה' })).toBeDisabled();
  });
});
