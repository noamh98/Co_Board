import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from '../../data/db';
import { createSettingsRepo } from '../../data/settingsRepo';
import { logEvent } from '../../data/usageRepo';
import { UsageDashboard } from './UsageDashboard';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

describe('UsageDashboard — M7', () => {
  it('מציג מצב כבוי עם הסבר פרטיות', async () => {
    // analyticsEnabled=false (ברירת מחדל)
    render(<UsageDashboard profileId="p1" onClose={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText(/מעקב השימוש כבוי/)).toBeInTheDocument();
    });
    expect(screen.getByText(/הפעל מעקב/)).toBeInTheDocument();
  });

  it('מציג top-10 תאים כשיש נתונים', async () => {
    const repo = createSettingsRepo();
    await repo.setAnalyticsEnabled(true);
    const now = Date.now();
    await logEvent({ profileId: 'p1', boardId: 'b1', cellId: 'c1', label: 'אמא', timestamp: now, sessionId: 's' });
    await logEvent({ profileId: 'p1', boardId: 'b1', cellId: 'c1', label: 'אמא', timestamp: now, sessionId: 's' });
    await logEvent({ profileId: 'p1', boardId: 'b1', cellId: 'c2', label: 'אבא', timestamp: now, sessionId: 's' });

    render(<UsageDashboard profileId="p1" onClose={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText(/אמא/)).toBeInTheDocument();
    });
    expect(screen.getByText(/אבא/)).toBeInTheDocument();
  });

  it('כפתור נקה נתונים מציג ConfirmDialog נגיש (2.3)', async () => {
    const repo = createSettingsRepo();
    await repo.setAnalyticsEnabled(true);

    render(<UsageDashboard profileId="p1" onClose={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('נקה נתונים')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('נקה נתונים'));
    expect(
      await screen.findByText('למחוק את כל נתוני השימוש לפרופיל זה?'),
    ).toBeInTheDocument();

    // ביטול לא מוחק
    fireEvent.click(screen.getByText('ביטול'));
    expect(screen.queryByText('למחוק את כל נתוני השימוש לפרופיל זה?')).toBeNull();
  });

  it('toggle מפעיל מעקב ומציג נתונים', async () => {
    render(<UsageDashboard profileId="p1" onClose={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByLabelText('מעקב שימוש')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('מעקב שימוש'));
    await waitFor(() => {
      expect(screen.getByText(/10 תאים שימושיים ביותר/)).toBeInTheDocument();
    });
  });
});
