import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog (U-2/X-3 — מחליף window.confirm)', () => {
  it('מציג את ההודעה וקורא ל-onConfirm/onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog message="למחוק?" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    expect(screen.getByText('למחוק?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('אישור'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('ביטול'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape קורא ל-onCancel (D1)', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog message="למחוק?" onConfirm={() => {}} onCancel={onCancel} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('שורות מרובות (\\n) הופכות לפסקאות נפרדות', () => {
    render(
      <ConfirmDialog message={'שורה א\'\nשורה ב\''} onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByText("שורה א'")).toBeInTheDocument();
    expect(screen.getByText("שורה ב'")).toBeInTheDocument();
  });
});
