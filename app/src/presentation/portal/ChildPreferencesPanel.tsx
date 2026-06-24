// presentation/portal/ChildPreferencesPanel.tsx — העדפות ילד (2B).
// GridSizePicker + קול + עומס ויזואלי.

import { useState } from 'react';
import type { ProfilePreferences } from '../../domain/models';
import { GRID_MIN, GRID_MAX } from '../../domain/adaptivity';

interface Props {
  childName: string;
  preferences: ProfilePreferences;
  onChange: (prefs: ProfilePreferences) => void;
  onClose: () => void;
}

export function ChildPreferencesPanel({
  childName,
  preferences,
  onChange,
  onClose,
}: Props) {
  const [prefs, setPrefs] = useState<ProfilePreferences>(preferences);

  function update(partial: Partial<ProfilePreferences>): void {
    const next = { ...prefs, ...partial };
    setPrefs(next);
  }

  function save(): void {
    onChange(prefs);
    onClose();
  }

  const rows = prefs.preferredGridSize?.rows ?? 4;
  const cols = prefs.preferredGridSize?.cols ?? 4;

  return (
    <div
      className="panel-overlay"
      dir="rtl"
      role="dialog"
      aria-label={`הגדרות ${childName}`}
      aria-modal="true"
    >
      <div className="panel-overlay__content">
        <h2 className="panel-overlay__title">הגדרות — {childName}</h2>

        <section>
          <h3 className="panel-overlay__section-title">גודל גריד מועדף</h3>
          <div className="child-prefs__grid-row">
            <label>
              שורות ({GRID_MIN}–{GRID_MAX}):
              <input
                type="number"
                min={GRID_MIN}
                max={GRID_MAX}
                value={rows}
                onChange={(e) =>
                  update({
                    preferredGridSize: {
                      rows: Math.max(GRID_MIN, Math.min(GRID_MAX, Number(e.target.value))),
                      cols,
                    },
                  })
                }
                className="login-panel__input"
                style={{ width: '4rem' }}
              />
            </label>
            <label>
              עמודות ({GRID_MIN}–{GRID_MAX}):
              <input
                type="number"
                min={GRID_MIN}
                max={GRID_MAX}
                value={cols}
                onChange={(e) =>
                  update({
                    preferredGridSize: {
                      rows,
                      cols: Math.max(GRID_MIN, Math.min(GRID_MAX, Number(e.target.value))),
                    },
                  })
                }
                className="login-panel__input"
                style={{ width: '4rem' }}
              />
            </label>
          </div>
        </section>

        <section>
          <h3 className="panel-overlay__section-title">קול ברירת מחדל</h3>
          <select
            className="login-panel__input"
            value={prefs.defaultVoice ?? ''}
            onChange={(e) =>
              update({
                defaultVoice: (e.target.value as ProfilePreferences['defaultVoice']) || undefined,
              })
            }
          >
            <option value="">ברירת מחדל</option>
            <option value="child">ילד</option>
            <option value="male">גבר</option>
            <option value="female">אישה</option>
          </select>
        </section>

        <section>
          <h3 className="panel-overlay__section-title">עומס ויזואלי</h3>
          <select
            className="login-panel__input"
            value={prefs.visualLoadLevel ?? 'standard'}
            onChange={(e) =>
              update({
                visualLoadLevel: e.target.value as ProfilePreferences['visualLoadLevel'],
              })
            }
          >
            <option value="minimal">מינימלי</option>
            <option value="standard">סטנדרטי</option>
            <option value="rich">עשיר</option>
          </select>
        </section>

        <div className="panel-overlay__footer">
          <button type="button" className="login-panel__btn login-panel__btn--primary" onClick={save}>
            שמור
          </button>
          <button type="button" className="login-panel__btn" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
