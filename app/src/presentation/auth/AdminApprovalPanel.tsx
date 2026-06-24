// presentation/auth/AdminApprovalPanel.tsx — ניהול אישורי משתמשים (אדמין בלבד).
// מוצג רק אם claims.admin=true. פאנל overlay מעל האפליקציה.
// RTL מלא.

import { useEffect, useState } from 'react';
import { getPendingUsers, setUserStatusViaFunction, type UserRecord } from '../../services/sync/firebaseAuth';

interface Props {
  onClose: () => void;
}

export function AdminApprovalPanel({ onClose }: Props) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const list = await getPendingUsers();
      setUsers(list);
    } catch {
      setError('שגיאה בטעינת המשתמשים');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(uid: string, action: 'approved' | 'rejected'): Promise<void> {
    setProcessing(uid);
    setError(null);
    try {
      await setUserStatusViaFunction(uid, action);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch {
      setError('שגיאה בעדכון הסטטוס — נסה שנית');
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div
      className="panel-overlay"
      dir="rtl"
      role="dialog"
      aria-label="ניהול אישורי משתמשים"
      aria-modal="true"
    >
      <div className="panel-overlay__content">
        <h2 className="panel-overlay__title">ניהול משתמשים ממתינים</h2>

        {error && (
          <p className="login-panel__error" role="alert">{error}</p>
        )}

        {loading ? (
          <p role="status">טוען…</p>
        ) : users.length === 0 ? (
          <p>אין משתמשים ממתינים לאישור.</p>
        ) : (
          <ul className="admin-panel__list" aria-label="משתמשים ממתינים">
            {users.map((u) => (
              <li key={u.uid} className="admin-panel__item">
                <span className="admin-panel__name">{u.displayName || '(ללא שם)'}</span>
                <span className="admin-panel__email">{u.email}</span>
                <span className="admin-panel__date">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('he-IL') : ''}
                </span>
                <div className="admin-panel__actions">
                  <button
                    type="button"
                    className="login-panel__btn login-panel__btn--primary"
                    onClick={() => void handleApprove(u.uid, 'approved')}
                    disabled={processing === u.uid}
                    aria-label={`אשר את ${u.displayName}`}
                  >
                    אשר
                  </button>
                  <button
                    type="button"
                    className="login-panel__btn login-panel__btn--danger"
                    onClick={() => void handleApprove(u.uid, 'rejected')}
                    disabled={processing === u.uid}
                    aria-label={`דחה את ${u.displayName}`}
                  >
                    דחה
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="panel-overlay__footer">
          <button
            type="button"
            className="login-panel__btn"
            onClick={() => void load()}
            disabled={loading}
          >
            רענן
          </button>
          <button
            type="button"
            className="login-panel__btn"
            onClick={onClose}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
