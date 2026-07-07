// presentation/portal/AccessListPanel.tsx — רשימת "מי מורשה" + ביטול גישה (D-05).
// מציג את חברי childAccess של הילד; הבעלים יכול לבטל גישה של חבר (למעט עצמו).
// ביטול מתבצע דרך Cloud Function revokeChildAccess (Admin SDK, owner-only).

import { useEffect, useState } from 'react';
import {
  getChildAccessEntries,
  revokeChildAccess,
  type ChildAccessEntry,
  type ChildAccessRole,
} from '../../data/childRepo';

interface Props {
  childId: string;
  childName: string;
  ownerUid: string;
  onClose: () => void;
}

const ROLE_LABELS: Record<ChildAccessRole, string> = {
  parent: 'הורה (עריכה)',
  clinician: 'קליני (עריכה)',
  staff: 'צוות (שימוש בלבד)',
};

function formatExpiry(expiresAt: number | undefined): string | null {
  if (!expiresAt || expiresAt <= 0) return null;
  if (expiresAt <= Date.now()) return 'פג תוקף';
  const d = new Date(expiresAt);
  return `בתוקף עד ${d.toLocaleDateString('he-IL')}`;
}

export function AccessListPanel({ childId, childName, ownerUid, onClose }: Props) {
  const [entries, setEntries] = useState<ChildAccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [childId]);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const list = await getChildAccessEntries(childId);
      // מיון: בעלים (parent + הבעלים עצמו) קודם, אחר כך לפי מועד הענקה.
      setEntries(list.sort((a, b) => a.grantedAt - b.grantedAt));
    } catch {
      setError('שגיאה בטעינת רשימת ההרשאות — בדוק חיבור לרשת');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(memberUid: string): Promise<void> {
    setRevoking(memberUid);
    setError(null);
    try {
      await revokeChildAccess(childId, memberUid);
      setEntries((prev) => prev.filter((e) => e.uid !== memberUid));
    } catch {
      setError('ביטול הגישה נכשל — נסה שנית');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div
      className="panel-overlay"
      dir="rtl"
      role="dialog"
      aria-label={`הרשאות גישה — ${childName}`}
      aria-modal="true"
    >
      <div className="panel-overlay__content">
        <h2 className="panel-overlay__title">מי מורשה — {childName}</h2>

        {error && <p className="login-panel__error" role="alert">{error}</p>}

        {loading ? (
          <p role="status">טוען…</p>
        ) : (
          <ul className="access-list" aria-label="רשימת מורשים">
            {entries.map((entry) => {
              const isOwner = entry.uid === ownerUid;
              const expiry = formatExpiry(entry.expiresAt);
              return (
                <li key={entry.uid} className="access-list__item">
                  <div className="access-list__info">
                    <span className="access-list__role">{ROLE_LABELS[entry.role]}</span>
                    <span className="access-list__uid" dir="ltr">{entry.uid}</span>
                    {isOwner && <span className="access-list__badge">בעלים</span>}
                    {expiry && <span className="access-list__expiry">{expiry}</span>}
                  </div>
                  {!isOwner && (
                    <button
                      type="button"
                      className="login-panel__btn access-list__revoke"
                      onClick={() => void handleRevoke(entry.uid)}
                      disabled={revoking === entry.uid}
                      aria-label={`בטל גישה — ${ROLE_LABELS[entry.role]}`}
                    >
                      {revoking === entry.uid ? 'מבטל…' : 'בטל גישה'}
                    </button>
                  )}
                </li>
              );
            })}
            {entries.length === 0 && (
              <li className="access-list__empty">אין הרשאות פעילות.</li>
            )}
          </ul>
        )}

        <div className="panel-overlay__footer">
          <button type="button" className="login-panel__btn" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
