// presentation/settings/BoardManagementSection.tsx — סקשן "ניהול" בתוך ההגדרות.
// כאן עוברים האקשנים שהיו ב-AdultBar בן 12 הכפתורים (פירוק הסרגל, סעיף 4.3/4.4 בתוכנית):
// בורר פרופיל + יצירה, ערוך לוח, לוח חדש, גיבוי, סטטיסטיקה, ביטויים, מצא-מילה, פורטל,
// אדמין, מודלינג, התנתקות — כקבוצת-כפתורים אנכית נקייה (לא סרגל עליון עמוס).
//
// כל ה-handlers נשארים זהים — רק עוברים מקום (Ponytail: ארגון-מחדש, לא פיצ'ר חדש).
// בורר הפרופיל שומר label="פרופיל" כדי לשמר עקביות + כיסוי-בדיקות.

import { useState } from 'react';
import type { Profile } from '../../domain/models';

export interface BoardManagementSectionProps {
  profiles: Profile[];
  activeProfileId: string;
  onSwitch: (id: string) => void;
  /** ייצור פרופיל ישיר (שם בלבד) — פעיל כשאין onOpenWizard. */
  onCreate?: (name: string) => void;
  /** פתיחת אשף יצירת פרופיל — מועדף על onCreate. */
  onOpenWizard?: () => void;
  /** עריכת הלוח הנוכחי (builder). */
  onEditBoard?: () => void;
  /** יצירת לוח חדש — מחבר את NewBoardChooser הקיים (סעיף 4.5). */
  onNewBoard?: () => void;
  onOpenBackup?: () => void;
  onOpenAnalytics?: () => void;
  onOpenPhraseBank?: () => void;
  onOpenWordFinder?: () => void;
  onOpenPortal?: () => void;
  onOpenAdmin?: () => void;
  onSignOut?: () => void;
  modelingActive?: boolean;
  onToggleModeling?: () => void;
}

export function BoardManagementSection({
  profiles,
  activeProfileId,
  onSwitch,
  onCreate,
  onOpenWizard,
  onEditBoard,
  onNewBoard,
  onOpenBackup,
  onOpenAnalytics,
  onOpenPhraseBank,
  onOpenWordFinder,
  onOpenPortal,
  onOpenAdmin,
  onSignOut,
  modelingActive,
  onToggleModeling,
}: BoardManagementSectionProps) {
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
    <section className="settings-section" aria-labelledby="s-manage">
      <div className="settings-section__header">
        <span className="settings-section__icon" aria-hidden="true">🗂</span>
        <h3 className="settings-section__title" id="s-manage">ניהול</h3>
      </div>
      <div className="settings-section__body">
        {/* בחירת פרופיל פעיל */}
        <div className="mgmt-profile">
          <label className="voice-select-label" htmlFor="profile-select">פרופיל</label>
          <select
            id="profile-select"
            className="voice-select"
            value={activeProfileId}
            onChange={(e) => onSwitch(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* קבוצת-כפתורי ניהול אנכית נקייה */}
        <div className="mgmt-actions" role="group" aria-label="פעולות ניהול">
          {onNewBoard && (
            <button type="button" className="mgmt-actions__btn mgmt-actions__btn--primary" onClick={onNewBoard}>
              <span className="mgmt-actions__icon" aria-hidden="true">＋</span>
              לוח חדש
            </button>
          )}
          {onEditBoard && (
            <button type="button" className="mgmt-actions__btn" onClick={onEditBoard}>
              <span className="mgmt-actions__icon" aria-hidden="true">✏</span>
              ערוך לוח
            </button>
          )}

          {onOpenWizard ? (
            <button type="button" className="mgmt-actions__btn" onClick={onOpenWizard}>
              <span className="mgmt-actions__icon" aria-hidden="true">👤</span>
              פרופיל חדש
            </button>
          ) : adding ? (
            <div className="mgmt-actions__inline">
              <input
                className="voice-select"
                aria-label="שם פרופיל חדש"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button type="button" className="mgmt-actions__btn" onClick={submitNew}>
                <span className="mgmt-actions__icon" aria-hidden="true">✔</span>
                הוסף
              </button>
            </div>
          ) : (
            <button type="button" className="mgmt-actions__btn" onClick={() => setAdding(true)}>
              <span className="mgmt-actions__icon" aria-hidden="true">👤</span>
              פרופיל חדש
            </button>
          )}

          {onOpenBackup && (
            <button type="button" className="mgmt-actions__btn" onClick={onOpenBackup}>
              <span className="mgmt-actions__icon" aria-hidden="true">☁</span>
              גיבוי וסנכרון
            </button>
          )}
          {onOpenAnalytics && (
            <button type="button" className="mgmt-actions__btn" onClick={onOpenAnalytics}>
              <span className="mgmt-actions__icon" aria-hidden="true">📊</span>
              סטטיסטיקה
            </button>
          )}
          {onOpenPhraseBank && (
            <button type="button" className="mgmt-actions__btn" onClick={onOpenPhraseBank}>
              <span className="mgmt-actions__icon" aria-hidden="true">💬</span>
              ביטויים שמורים
            </button>
          )}
          {onOpenWordFinder && (
            <button type="button" className="mgmt-actions__btn" onClick={onOpenWordFinder}>
              <span className="mgmt-actions__icon" aria-hidden="true">🔍</span>
              מצא מילה
            </button>
          )}
          {onOpenPortal && (
            <button type="button" className="mgmt-actions__btn" onClick={onOpenPortal}>
              <span className="mgmt-actions__icon" aria-hidden="true">👨‍👩‍👧</span>
              ילדים
            </button>
          )}
          {onToggleModeling && (
            <button
              type="button"
              className={`mgmt-actions__btn${modelingActive ? ' mgmt-actions__btn--active' : ''}`}
              onClick={onToggleModeling}
              aria-pressed={modelingActive}
            >
              <span className="mgmt-actions__icon" aria-hidden="true">🎯</span>
              מודלינג
            </button>
          )}
          {onOpenAdmin && (
            <button type="button" className="mgmt-actions__btn mgmt-actions__btn--admin" onClick={onOpenAdmin}>
              <span className="mgmt-actions__icon" aria-hidden="true">🛠</span>
              אדמין
            </button>
          )}
          {onSignOut && (
            <button type="button" className="mgmt-actions__btn mgmt-actions__btn--danger" onClick={onSignOut}>
              <span className="mgmt-actions__icon" aria-hidden="true">⬅</span>
              התנתקות
            </button>
          )}
        </div>

        {/* סעיף "מתקדם" — PIN כ-opt-in: מחסום-ילד קשיח לרגולציה/קליניקה.
            ל-MVP השחרור הוא לחיצה-ארוכה בלבד; ה-opt-in מתועד וממתין לחיווט.
            TODO(opt-in PIN): כש-AccessSettings יכלול requirePin — להציג כאן Toggle
            + שדה הגדרת-קוד, ולהתנות את ה-onUnlock בלחיצה-ארוכה ב-PinGate הקיים. */}
        <p className="mgmt-note">
          שחרור מצב-העריכה מתבצע בלחיצה ארוכה על המנעול שבסרגל העליון.
        </p>
      </div>
    </section>
  );
}
