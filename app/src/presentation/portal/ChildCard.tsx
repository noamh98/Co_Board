// presentation/portal/ChildCard.tsx — כרטיסית ילד בפורטל המבוגר (2B).

import type { ChildRecord } from '../../data/childRepo';

interface Props {
  child: ChildRecord;
  onOpenPreferences: (childId: string) => void;
  onShareAccess: (childId: string) => void;
  onManageAccess: (childId: string) => void;
  /**
   * ילד משותף שהתקבל דרך childAccess (D-01) — קריאה בלבד. פעולות owner-only
   * (הגדרות/שיתוף/ניהול גישה) מוסתרות; הכתיבה נשארת של הבעלים בלבד.
   */
  readOnly?: boolean;
}

export function ChildCard({
  child,
  onOpenPreferences,
  onShareAccess,
  onManageAccess,
  readOnly = false,
}: Props) {
  return (
    <article
      className="child-card"
      dir="rtl"
      aria-label={`ילד: ${child.name}`}
    >
      <h3 className="child-card__name">{child.name}</h3>
      {child.age !== undefined && (
        <p className="child-card__age">גיל: {child.age}</p>
      )}
      {readOnly ? (
        <p className="child-card__shared-badge">משותף (קריאה בלבד)</p>
      ) : (
        <div className="child-card__actions">
          <button
            type="button"
            className="login-panel__btn login-panel__btn--primary"
            onClick={() => onOpenPreferences(child.childId)}
          >
            הגדרות
          </button>
          <button
            type="button"
            className="login-panel__btn"
            onClick={() => onShareAccess(child.childId)}
          >
            שתף גישה
          </button>
          <button
            type="button"
            className="login-panel__btn"
            onClick={() => onManageAccess(child.childId)}
          >
            מי מורשה
          </button>
        </div>
      )}
    </article>
  );
}
