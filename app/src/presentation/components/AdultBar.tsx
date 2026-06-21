import { useState } from 'react';
import type { Profile } from '../../domain/models';

// סרגל מצב מבוגר: בורר פרופיל פעיל, יצירת פרופיל, וחזרה למצב נעול.
// מוצג רק במצב מבוגר (canManageProfiles) — ניהול פרופילים נעול בקוד (PRD §4.5).
export function AdultBar({
  profiles,
  activeProfileId,
  onSwitch,
  onCreate,
  onOpenWizard,
  onLock,
  onEditBoard,
  onOpenSettings,
  onOpenBackup,
  onOpenAnalytics,
  onSignOut,
}: {
  profiles: Profile[];
  activeProfileId: string;
  onSwitch: (id: string) => void;
  /** ייצור פרופיל ישיר (שם בלבד) — פעיל כשאין onOpenWizard */
  onCreate?: (name: string) => void;
  /** פתיחת אשף יצירת פרופיל — מעדיף על פני onCreate כשקיים */
  onOpenWizard?: () => void;
  onLock: () => void;
  onEditBoard?: () => void;
  onOpenSettings?: () => void;
  onOpenBackup?: () => void;
  onOpenAnalytics?: () => void;
  onSignOut?: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const submitNew = (): void => {
    const name = newName.trim();
    if (!name) return;
    onCreate?.(name);
    setNewName('');
    setAdding(false);
  };

  return (
    <div className="adultbar" aria-label="ניהול מבוגר">
      <label className="adultbar__label" htmlFor="profile-select">
        פרופיל
      </label>
      <select
        id="profile-select"
        className="adultbar__select"
        value={activeProfileId}
        onChange={(e) => onSwitch(e.target.value)}
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {onOpenWizard ? (
        <button
          type="button"
          className="adultbar__btn"
          onClick={onOpenWizard}
        >
          פרופיל חדש
        </button>
      ) : adding ? (
        <>
          <input
            className="adultbar__input"
            aria-label="שם פרופיל חדש"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="button"
            className="adultbar__btn"
            onClick={submitNew}
          >
            הוסף
          </button>
        </>
      ) : (
        <button
          type="button"
          className="adultbar__btn"
          onClick={() => setAdding(true)}
        >
          פרופיל חדש
        </button>
      )}

      {onEditBoard && (
        <button type="button" className="adultbar__btn" onClick={onEditBoard}>
          ערוך לוח
        </button>
      )}

      {onOpenSettings && (
        <button type="button" className="adultbar__btn" onClick={onOpenSettings}>
          הגדרות
        </button>
      )}

      {onOpenBackup && (
        <button type="button" className="adultbar__btn" onClick={onOpenBackup}>
          גיבוי וסנכרון
        </button>
      )}

      {onOpenAnalytics && (
        <button type="button" className="adultbar__btn" onClick={onOpenAnalytics}>
          סטטיסטיקה
        </button>
      )}

      {onSignOut && (
        <button type="button" className="adultbar__btn" onClick={onSignOut}>
          התנתק
        </button>
      )}

      <button type="button" className="adultbar__btn" onClick={onLock}>
        נעל
      </button>
    </div>
  );
}
