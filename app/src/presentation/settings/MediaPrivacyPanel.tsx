// presentation/settings/MediaPrivacyPanel.tsx — הגדרות פרטיות מדיה (חלק 3).
// זהה לסגנון PrivacyToggle הקיים. RTL מלא, WCAG 2.1 AA.
// פרטיות: תמונות מוצפנות client-side; המבוגר שולט במה שעולה (PRD §8.4).

import { useState } from 'react';

interface Props {
  syncPhotos: boolean;
  onSyncPhotosChange: (enabled: boolean) => void;
  /** אם מסופק — מאפשר מחיקת כל התמונות מהענן. */
  onDeleteFromCloud?: () => Promise<void>;
  /** האם המשתמש מחובר (בלעדיו לא ניתן לסנכרן). */
  isAuthenticated: boolean;
}

export function MediaPrivacyPanel({
  syncPhotos,
  onSyncPhotosChange,
  onDeleteFromCloud,
  isAuthenticated,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDelete = async () => {
    if (!onDeleteFromCloud) return;
    if (!confirm('האם למחוק את כל התמונות מהענן? התמונות יישמרו במכשיר זה.')) return;
    setDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(false);
    try {
      await onDeleteFromCloud();
      setDeleteSuccess(true);
    } catch {
      setDeleteError('מחיקה נכשלה — נסה שוב');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="privacy-toggle" dir="rtl" aria-labelledby="media-privacy-title">
      <h3 className="privacy-toggle__title" id="media-privacy-title">
        תמונות אישיות — פרטיות וסנכרון
      </h3>
      <p className="privacy-toggle__desc">
        תמונות אישיות (בני משפחה וכו׳) נשמרות{' '}
        <strong>מקומית בלבד</strong> כברירת מחדל.
        הפעלת סנכרון תעלה תמונות <strong>מוצפנות</strong> לענן —
        רק אנשי צוות מורשים יכולים לגשת.
      </p>

      <label className="privacy-toggle__row" style={{ alignItems: 'flex-start', gap: 10 }}>
        <input
          type="checkbox"
          checked={syncPhotos}
          disabled={!isAuthenticated}
          onChange={(e) => onSyncPhotosChange(e.target.checked)}
          aria-describedby="media-sync-desc"
          style={{ marginTop: 3, flexShrink: 0 }}
        />
        <span>
          סנכרן תמונות לענן{' '}
          {!isAuthenticated && (
            <span style={{ color: '#b45309', fontSize: '0.85rem' }}>
              (נדרשת כניסה לחשבון)
            </span>
          )}
        </span>
      </label>

      <p id="media-sync-desc" className="privacy-toggle__note">
        ההצפנה מתבצעת במכשיר לפני ההעלאה. מפתח ההצפנה לא עולה לענן לעולם.
      </p>

      {onDeleteFromCloud && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting || !isAuthenticated}
            aria-busy={deleting}
            style={{
              minHeight: 40,
              padding: '0 16px',
              border: '1px solid #fca5a5',
              borderRadius: 10,
              background: deleting ? '#f3f4f6' : '#fef2f2',
              color: '#b91c1c',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: deleting || !isAuthenticated ? 'not-allowed' : 'pointer',
              opacity: !isAuthenticated ? 0.5 : 1,
            }}
          >
            {deleting ? 'מוחק…' : 'מחק תמונות מהענן'}
          </button>
          {deleteSuccess && (
            <span
              role="status"
              style={{ marginRight: 10, fontSize: '0.85rem', color: '#16a34a' }}
            >
              נמחק בהצלחה
            </span>
          )}
          {deleteError && (
            <span
              role="alert"
              style={{ marginRight: 10, fontSize: '0.85rem', color: '#b91c1c' }}
            >
              {deleteError}
            </span>
          )}
          <p className="privacy-toggle__note" style={{ marginTop: 6 }}>
            התמונות יישמרו במכשיר זה; רק העותק בענן יימחק.
          </p>
        </div>
      )}
    </section>
  );
}
