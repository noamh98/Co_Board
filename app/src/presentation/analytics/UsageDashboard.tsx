import { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analytics/analyticsService';
import { createSettingsRepo } from '../../data/settingsRepo';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface TopCell {
  label: string;
  count: number;
}

export function UsageDashboard({
  profileId,
  onClose,
}: {
  profileId: string;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [topCells, setTopCells] = useState<TopCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    void (async () => {
      const repo = createSettingsRepo();
      const isEnabled = await repo.getAnalyticsEnabled();
      setEnabled(isEnabled);
      if (isEnabled) {
        setTopCells(await analyticsService.getTopCells(profileId));
      }
      setLoading(false);
    })();
  }, [profileId]);

  const handleToggle = (val: boolean): void => {
    void (async () => {
      const repo = createSettingsRepo();
      await repo.setAnalyticsEnabled(val);
      setEnabled(val);
      if (val) {
        setTopCells(await analyticsService.getTopCells(profileId));
      } else {
        setTopCells([]);
      }
    })();
  };

  const handleClear = (): void => setConfirmClear(true);

  const confirmClearData = (): void => {
    setConfirmClear(false);
    void analyticsService.clearAllData(profileId).then(() => setTopCells([]));
  };

  if (loading) {
    return (
      <div className="usage-dashboard" dir="rtl" role="dialog" aria-label="סטטיסטיקת שימוש">
        <p>טוען...</p>
      </div>
    );
  }

  return (
    <div className="usage-dashboard" dir="rtl" role="dialog" aria-label="סטטיסטיקת שימוש">
      <h2>סטטיסטיקת שימוש</h2>

      <label className="usage-dashboard__toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          aria-label="מעקב שימוש"
        />
        מעקב שימוש (opt-in)
      </label>

      {!enabled ? (
        <div className="usage-dashboard__disabled">
          <p>מעקב השימוש כבוי.</p>
          <p>
            הפעל כדי לראות אילו תאים הילד לוחץ הכי הרבה. המידע נשמר במכשיר בלבד
            ואינו משותף עם גורמים חיצוניים.
          </p>
          <button
            type="button"
            className="adultbar__btn"
            onClick={() => handleToggle(true)}
          >
            הפעל מעקב
          </button>
        </div>
      ) : (
        <div className="usage-dashboard__data">
          <h3>10 תאים שימושיים ביותר (שבוע אחרון)</h3>
          {topCells.length === 0 ? (
            <p>אין נתונים עדיין</p>
          ) : (
            <ol className="usage-dashboard__list">
              {topCells.map((c) => (
                <li key={c.label}>
                  <span className="usage-dashboard__label">{c.label}</span>
                  <span className="usage-dashboard__count">{c.count} פעמים</span>
                </li>
              ))}
            </ol>
          )}
          <button
            type="button"
            className="adultbar__btn"
            onClick={handleClear}
          >
            נקה נתונים
          </button>
        </div>
      )}

      <button type="button" className="adultbar__btn" onClick={onClose}>
        סגור
      </button>

      {confirmClear && (
        <ConfirmDialog
          title="ניקוי נתונים"
          message="למחוק את כל נתוני השימוש לפרופיל זה?"
          confirmLabel="מחק"
          danger
          onConfirm={confirmClearData}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
