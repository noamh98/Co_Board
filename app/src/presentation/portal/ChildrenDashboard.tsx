// presentation/portal/ChildrenDashboard.tsx — דשבורד ילדים בפורטל המבוגר (2B).
// רשימת ילדים (עצמיים + משותפים) + הוספת ילד + שיתוף וגישה מאוחד (D-05).
// 3.1 (B-07): initialInviteCode פותח אוטומטית את מסך קבלת ההזמנה מ-deep-link.

import { useEffect, useState } from 'react';
import type { ProfilePreferences } from '../../domain/models';
import {
  listChildren,
  listSharedChildren,
  createChild,
  saveChild,
  type ChildRecord,
} from '../../data/childRepo';
import { ChildCard } from './ChildCard';
import { ChildPreferencesPanel } from './ChildPreferencesPanel';
import { ShareInvitePanel } from './ShareInvitePanel';
import { AcceptInviteScreen } from './AcceptInviteScreen';

interface Props {
  uid: string;
  onClose: () => void;
  /** 3.1 (B-07): קוד הזמנה מ-deep-link — פותח אוטומטית את מסך קבלת ההזמנה. */
  initialInviteCode?: string;
  /** 3.1 (B-07): נקרא כשזרימת ההזמנה הסתיימה (קבלה/ביטול) — לניקוי ה-URL/state. */
  onInviteConsumed?: () => void;
}

/** ילד משותף = נושא ownerUid של בעלים אחר (D-01) — קריאה בלבד. */
function isSharedChild(child: ChildRecord, uid: string): boolean {
  return !!child.ownerUid && child.ownerUid !== uid;
}

export function ChildrenDashboard({
  uid,
  onClose,
  initialInviteCode,
  onInviteConsumed,
}: Props) {
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');

  const [prefsChild, setPrefsChild] = useState<ChildRecord | null>(null);
  const [shareChild, setShareChild] = useState<ChildRecord | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [uid]);

  // 3.1 (B-07): deep-link עם קוד → פתיחה-אוטומטית של מסך קבלת ההזמנה.
  useEffect(() => {
    if (initialInviteCode) setAcceptingInvite(true);
  }, [initialInviteCode]);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      // D-01 end-to-end: ממזג ילדים עצמיים + משותפים (dedupe לפי childId; עצמי גובר).
      const [own, shared] = await Promise.all([
        listChildren(uid),
        listSharedChildren(uid),
      ]);
      const byId = new Map<string, ChildRecord>();
      for (const c of own) {
        if (!c.archivedAt) byId.set(c.childId, c);
      }
      for (const c of shared) {
        if (!byId.has(c.childId)) byId.set(c.childId, c);
      }
      setChildren([...byId.values()]);
    } catch {
      setError('שגיאה בטעינת ילדים — בדוק חיבור לרשת');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddChild(): Promise<void> {
    const name = newChildName.trim();
    if (!name) return;
    try {
      const child = await createChild(
        uid,
        name,
        newChildAge ? Number(newChildAge) : undefined,
      );
      setChildren((prev) => [...prev, child]);
      setNewChildName('');
      setNewChildAge('');
      setAddingChild(false);
    } catch {
      setError('שגיאה ביצירת פרופיל ילד');
    }
  }

  async function handlePrefsChange(childId: string, prefs: ProfilePreferences): Promise<void> {
    const child = children.find((c) => c.childId === childId);
    if (!child) return;
    // בטיחות: לא כותבים העדפות לילד משותף (הכתיבה שייכת לבעלים בלבד).
    if (isSharedChild(child, uid)) return;
    const updated = { ...child, preferences: prefs };
    await saveChild(uid, updated);
    setChildren((prev) => prev.map((c) => (c.childId === childId ? updated : c)));
  }

  // 3.1 (B-07): סגירת זרימת ההזמנה — מודיע לקורא לניקוי ה-URL/state.
  function closeAcceptInvite(): void {
    setAcceptingInvite(false);
    onInviteConsumed?.();
  }

  return (
    <div
      className="panel-overlay"
      dir="rtl"
      role="dialog"
      aria-label="ניהול ילדים"
      aria-modal="true"
    >
      <div className="panel-overlay__content">
        <h2 className="panel-overlay__title">ילדים</h2>

        {error && <p className="login-panel__error" role="alert">{error}</p>}

        {loading ? (
          <p role="status">טוען…</p>
        ) : (
          <div className="children-dashboard__list">
            {children.map((child) => (
              <ChildCard
                key={child.childId}
                child={child}
                readOnly={isSharedChild(child, uid)}
                onOpenPreferences={(cid) => setPrefsChild(children.find((c) => c.childId === cid) ?? null)}
                onShareAccess={(cid) => setShareChild(children.find((c) => c.childId === cid) ?? null)}
              />
            ))}
            {children.length === 0 && (
              <p>אין ילדים מוגדרים. לחץ "הוסף ילד" כדי להוסיף.</p>
            )}
          </div>
        )}

        {addingChild ? (
          <div className="children-dashboard__add" dir="rtl">
            <label className="login-panel__label" htmlFor="new-child-name">שם הילד</label>
            <input
              id="new-child-name"
              className="login-panel__input"
              type="text"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              dir="rtl"
            />
            <label className="login-panel__label" htmlFor="new-child-age">גיל (אופציונלי)</label>
            <input
              id="new-child-age"
              className="login-panel__input"
              type="number"
              min={0}
              max={25}
              value={newChildAge}
              onChange={(e) => setNewChildAge(e.target.value)}
              dir="ltr"
            />
            <div className="panel-overlay__footer">
              <button
                type="button"
                className="login-panel__btn login-panel__btn--primary"
                onClick={() => void handleAddChild()}
                disabled={!newChildName.trim()}
              >
                הוסף
              </button>
              <button
                type="button"
                className="login-panel__btn"
                onClick={() => { setAddingChild(false); setNewChildName(''); setNewChildAge(''); }}
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <div className="panel-overlay__footer">
            <button
              type="button"
              className="login-panel__btn login-panel__btn--primary"
              onClick={() => setAddingChild(true)}
            >
              הוסף ילד
            </button>
            <button
              type="button"
              className="login-panel__btn"
              onClick={() => setAcceptingInvite(true)}
            >
              קבל גישה (קוד שיתוף)
            </button>
            <button type="button" className="login-panel__btn" onClick={onClose}>
              סגור
            </button>
          </div>
        )}
      </div>

      {prefsChild && (
        <ChildPreferencesPanel
          childName={prefsChild.name}
          preferences={prefsChild.preferences ?? {}}
          onChange={(prefs) => void handlePrefsChange(prefsChild.childId, prefs)}
          onClose={() => setPrefsChild(null)}
        />
      )}

      {shareChild && (
        <ShareInvitePanel
          childId={shareChild.childId}
          childName={shareChild.name}
          ownerUid={uid}
          onClose={() => setShareChild(null)}
        />
      )}

      {acceptingInvite && (
        <AcceptInviteScreen
          uid={uid}
          initialCode={initialInviteCode}
          onAccepted={() => {
            // D-01: רענון מלא — מושך את המצביע המתמיד (sharedChildren) + ownerUid,
            // כך שהילד המשותף יורד רענון ומוצג read-only.
            closeAcceptInvite();
            void load();
          }}
          onClose={closeAcceptInvite}
        />
      )}
    </div>
  );
}
