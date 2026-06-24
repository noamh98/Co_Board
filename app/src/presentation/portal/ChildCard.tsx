// presentation/portal/ChildCard.tsx — כרטיסית ילד בפורטל המבוגר (2B).

import type { ChildRecord } from '../../data/childRepo';

interface Props {
  child: ChildRecord;
  onOpenPreferences: (childId: string) => void;
  onShareAccess: (childId: string) => void;
}

export function ChildCard({ child, onOpenPreferences, onShareAccess }: Props) {
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
      </div>
    </article>
  );
}
