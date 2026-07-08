import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QrCodeView } from './QrCodeView';

describe('portal/QrCodeView (C-12)', () => {
  it('מרנדר SVG נגיש עם role=img ותווית', () => {
    render(<QrCodeView value="A1B2C3D4E5F60718293A4B5C6D7E8F90" label="קוד QR לשיתוף" />);
    const img = screen.getByRole('img', { name: 'קוד QR לשיתוף' });
    expect(img.tagName.toLowerCase()).toBe('svg');
    // v2 = 25 מודולים + 2×4 quiet zone = 33
    expect(img.getAttribute('viewBox')).toBe('0 0 33 33');
    // רקע לבן + נתיב מודולים כהה
    expect(img.querySelector('rect')).not.toBeNull();
    expect(img.querySelector('path')).not.toBeNull();
  });

  it('ממיר אותיות קטנות לגדולות כדי לקודד קוד hex', () => {
    render(<QrCodeView value="a1b2c3d4e5f60718293a4b5c6d7e8f90" label="קוד QR" />);
    expect(screen.getByRole('img', { name: 'קוד QR' })).toBeInTheDocument();
  });

  it('נופל בחן לטקסט חלופי כשהקידוד נכשל', () => {
    // '@' אינו ב-charset האלפאנומרי גם אחרי uppercase → generateQr זורק.
    render(<QrCodeView value="@@@" label="קוד QR" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('note')).toBeInTheDocument();
  });
});
