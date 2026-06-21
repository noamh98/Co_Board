import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from '../../data/db';
import { ensureSeeded } from '../../data/bootstrap';
import { QuickStartWizard } from './QuickStartWizard';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

describe('QuickStartWizard', () => {
  it('מציג שלב 1 — שדה שם פרופיל', () => {
    render(<QuickStartWizard onComplete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText('שם הפרופיל')).toBeInTheDocument();
    expect(screen.getByText('הבא')).toBeInTheDocument();
  });

  it('מעבר לשלב 2 — כרטיסיות תבניות מוצגות', () => {
    render(<QuickStartWizard onComplete={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('שם הפרופיל'), {
      target: { value: 'דני' },
    });
    fireEvent.click(screen.getByText('הבא'));
    expect(screen.getByText('בחר תבנית לוח ראשונית:')).toBeInTheDocument();
    // כל 4 תבניות מוצגות — שם מדויק של התבנית
    expect(screen.getByText('מילות ליבה (4×4)')).toBeInTheDocument();
    expect(screen.getByText('PECS בסיסי (6×3)')).toBeInTheDocument();
    expect(screen.getByText('רגשות (3×3)')).toBeInTheDocument();
    expect(screen.getByText('לוח ריק (4×4)')).toBeInTheDocument();
  });

  it('בחירת תבנית מסמנת אותה', () => {
    render(<QuickStartWizard onComplete={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('שם הפרופיל'), {
      target: { value: 'דני' },
    });
    fireEvent.click(screen.getByText('הבא'));

    const pecsCard = screen.getByRole('button', { name: /PECS/ });
    fireEvent.click(pecsCard);
    expect(pecsCard).toHaveAttribute('aria-pressed', 'true');
  });

  it('השלמת wizard — קורא onComplete עם profileId', async () => {
    await ensureSeeded();
    const onComplete = vi.fn();
    render(<QuickStartWizard onComplete={onComplete} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('שם הפרופיל'), {
      target: { value: 'דני' },
    });
    fireEvent.click(screen.getByText('הבא'));
    fireEvent.click(screen.getByText('הבא'));
    fireEvent.click(screen.getByText('צור פרופיל'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledOnce();
      expect(typeof onComplete.mock.calls[0][0]).toBe('string');
    });
  });
});
