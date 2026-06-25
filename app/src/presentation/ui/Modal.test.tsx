import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

// D1 — נגישות מודאל: role=dialog, Escape סוגר, פוקוס נכנס בפתיחה וחוזר בסגירה.
describe('Modal (a11y D1)', () => {
  it('role=dialog + aria-modal', () => {
    render(
      <Modal title="כותרת" onClose={() => {}}>
        <button>פעולה</button>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('Escape קורא ל-onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal title="כותרת" onClose={onClose}>
        <button>פעולה</button>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('פוקוס עובר לתוך המודאל בפתיחה', () => {
    render(
      <Modal title="כותרת" onClose={() => {}}>
        <button>פעולה</button>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('הפוקוס חוזר לאלמנט הקודם בסגירה', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(
      <Modal title="כותרת" onClose={() => {}}>
        <button>פעולה</button>
      </Modal>,
    );
    expect(document.activeElement).not.toBe(trigger);

    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
