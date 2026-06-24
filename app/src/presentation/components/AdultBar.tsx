import { useState } from 'react';
import type { Profile } from '../../domain/models';

// סרגל מצב מבוגר: בורר פרופיל פעיל, יצירת פרופיל, וחזרה למצב נעול.
// מוצג רק במצב מבוגר (canManageProfiles) — ניהול פרופילים נעול בקוד (PRD §4.5).
// כפתורים: icon-span (aria-hidden) + text-span; CSS מסתיר text בפאן צר.
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
  onOpenPhraseBank,
  onOpenWordFinder,
  onSignOut,
  modelingActive,
  onToggleModeling,
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
  onOpenPhraseBank?: () => void;
  onOpenWordFinder?: () => void;
  onSignOut?: () => void;
  modelingActive?: boolean;
  onToggleModeling?: () => void;
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

  const Btn = ({
    icon,
    children,
    className,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string }) => (
    <button type="button" className={['adultbar__btn', className].filter(Boolean).join(' ')} {...rest}>
      <span className="adultbar__btn-icon" aria-hidden="true">{icon}</span>
      <span className="adultbar__btn-text">{children}</span>
    </button>
  );

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
        <Btn icon="➕" onClick={onOpenWizard}>פרופיל חדש</Btn>
      ) : adding ? (
        <>
          <input
            className="adultbar__input"
            aria-label="שם פרופיל חדש"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Btn icon="✔" onClick={submitNew}>הוסף</Btn>
        </>
      ) : (
        <Btn icon="➕" onClick={() => setAdding(true)}>פרופיל חדש</Btn>
      )}

      {onEditBoard && (
        <Btn icon="✏" onClick={onEditBoard}>ערוך לוח</Btn>
      )}

      {onOpenSettings && (
        <Btn icon="⚙" className="adultbar__btn--settings" onClick={onOpenSettings}>
          הגדרות
        </Btn>
      )}

      {onOpenBackup && (
        <Btn icon="☁" onClick={onOpenBackup}>גיבוי וסנכרון</Btn>
      )}

      {onOpenAnalytics && (
        <Btn icon="📊" onClick={onOpenAnalytics}>סטטיסטיקה</Btn>
      )}

      {onOpenPhraseBank && (
        <Btn icon="💬" onClick={onOpenPhraseBank}>ביטויים שמורים</Btn>
      )}

      {onOpenWordFinder && (
        <Btn icon="🔍" onClick={onOpenWordFinder}>מצא מילה</Btn>
      )}

      {onSignOut && (
        <Btn icon="⬅" onClick={onSignOut}>התנתק</Btn>
      )}

      {onToggleModeling && (
        <button
          type="button"
          onClick={onToggleModeling}
          aria-pressed={modelingActive}
          className={modelingActive ? 'adult-btn adult-btn--active' : 'adult-btn'}
        >
          <span className="adultbar__btn-icon" aria-hidden="true">🎯</span>
          <span className="adultbar__btn-text">מודלינג</span>
        </button>
      )}

      <Btn icon="🔒" onClick={onLock}>נעל</Btn>
    </div>
  );
}
