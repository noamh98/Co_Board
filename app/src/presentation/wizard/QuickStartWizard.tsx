import { useState } from 'react';
import { listTemplates } from '../../domain/boardTemplates';
import { createProfileFromTemplate } from '../../data/bootstrap';
import type { GridSize } from '../../domain/models';
import { GRID_MIN, GRID_MAX } from '../../domain/adaptivity';

// ויזארד יצירת פרופיל חדש עם בחירת תבנית לוח וגודל גריד.
// 3 שלבים: שם → בחירת תבנית + גודל גריד → אישור ויצירה.
// RTL מלא. ניתן לסגור ב-X.

interface Props {
  onComplete: (profileId: string) => void;
  onClose: () => void;
}

const TEMPLATES = listTemplates();

const PRESET_SIZES: Array<{ rows: number; cols: number; label: string }> = [
  { rows: 2, cols: 2, label: '2×2' },
  { rows: 3, cols: 3, label: '3×3' },
  { rows: 4, cols: 4, label: '4×4' },
  { rows: 5, cols: 3, label: '5×3' },
  { rows: 5, cols: 5, label: '5×5' },
  { rows: 6, cols: 6, label: '6×6' },
  { rows: 6, cols: 8, label: '6×8' },
  { rows: 8, cols: 8, label: '8×8' },
];

const SIZES = Array.from({ length: GRID_MAX - GRID_MIN + 1 }, (_, i) => i + GRID_MIN);

export function QuickStartWizard({ onComplete, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('core4x4');
  const [creating, setCreating] = useState(false);
  const [customGrid, setCustomGrid] = useState<GridSize | null>(null);
  const [showGridCustom, setShowGridCustom] = useState(false);

  const defaultGrid = (): GridSize => {
    const tpl = TEMPLATES.find((t) => t.id === selectedTemplate);
    return tpl?.board.grid ?? { rows: 4, cols: 4 };
  };

  const effectiveGrid = customGrid ?? defaultGrid();

  const goToStep2 = (): void => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('יש להזין שם פרופיל');
      return;
    }
    setNameError('');
    setStep(2);
  };

  const goToStep3 = (): void => setStep(3);

  const handleCreate = (): void => {
    setCreating(true);
    void (async () => {
      const profileId = await createProfileFromTemplate(
        name.trim(),
        selectedTemplate,
        customGrid ?? undefined,
      );
      onComplete(profileId);
    })();
  };

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    setCustomGrid(null); // איפוס גריד מותאם כשמשנים תבנית
    setShowGridCustom(false);
  };

  const selectedTpl = TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div
      className="wizard-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="אשף יצירת פרופיל חדש"
      dir="rtl"
    >
      <div className="wizard">
        {/* כותרת + סגירה */}
        <div className="wizard__header">
          <h2 className="wizard__title">פרופיל חדש</h2>
          <button
            type="button"
            className="wizard__close"
            aria-label="סגור"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* מחוון שלבים */}
        <div className="wizard__progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`wizard__step${step === s ? ' wizard__step--active' : step > s ? ' wizard__step--done' : ''}`}
              aria-label={`שלב ${s}`}
            >
              {s}
            </span>
          ))}
        </div>

        {/* שלב 1 — שם פרופיל */}
        {step === 1 && (
          <div className="wizard__body">
            <label className="wizard__label" htmlFor="profile-name">
              שם הפרופיל
            </label>
            <input
              id="profile-name"
              className="wizard__input"
              type="text"
              dir="rtl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goToStep2()}
              placeholder="לדוגמה: דני"
              autoFocus
            />
            {nameError && (
              <p className="wizard__error" role="alert">
                {nameError}
              </p>
            )}
            <div className="wizard__actions">
              <button type="button" className="wizard__btn wizard__btn--primary" onClick={goToStep2}>
                הבא
              </button>
            </div>
          </div>
        )}

        {/* שלב 2 — בחירת תבנית + גודל גריד */}
        {step === 2 && (
          <div className="wizard__body">
            <p className="wizard__hint">בחר תבנית לוח ראשונית:</p>
            <div className="wizard__templates">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`wizard__template-card${selectedTemplate === t.id ? ' wizard__template-card--selected' : ''}`}
                  onClick={() => handleTemplateSelect(t.id)}
                  aria-pressed={selectedTemplate === t.id}
                >
                  <strong className="wizard__template-name">{t.nameHe}</strong>
                  <span className="wizard__template-desc">{t.description}</span>
                </button>
              ))}
            </div>

            {/* גודל גריד */}
            <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '0.9rem', color: '#374151', fontWeight: 600 }}>
                  גודל לוח: {effectiveGrid.rows}×{effectiveGrid.cols}
                </span>
                <button
                  type="button"
                  style={{
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    background: 'none',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    padding: '2px 8px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowGridCustom((v) => !v)}
                >
                  {showGridCustom ? 'סגור' : 'שנה'}
                </button>
              </div>

              {showGridCustom && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* preset chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {PRESET_SIZES.map((p) => {
                      const active = effectiveGrid.rows === p.rows && effectiveGrid.cols === p.cols;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setCustomGrid({ rows: p.rows, cols: p.cols })}
                          style={{
                            padding: '3px 10px',
                            borderRadius: 16,
                            border: active ? '2px solid #1d4ed8' : '1px solid #d1d5db',
                            background: active ? '#dbeafe' : '#f3f4f6',
                            color: active ? '#1d4ed8' : '#374151',
                            fontSize: '0.8rem',
                            fontWeight: active ? 700 : 400,
                            cursor: 'pointer',
                            minHeight: 28,
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* free selectors */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      aria-label="שורות"
                      value={effectiveGrid.rows}
                      onChange={(e) =>
                        setCustomGrid({ rows: Number(e.target.value), cols: effectiveGrid.cols })
                      }
                      className="adultbar__select"
                    >
                      {SIZES.map((n) => (
                        <option key={n} value={n}>{n} שורות</option>
                      ))}
                    </select>
                    <span>×</span>
                    <select
                      aria-label="עמודות"
                      value={effectiveGrid.cols}
                      onChange={(e) =>
                        setCustomGrid({ rows: effectiveGrid.rows, cols: Number(e.target.value) })
                      }
                      className="adultbar__select"
                    >
                      {SIZES.map((n) => (
                        <option key={n} value={n}>{n} עמודות</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="wizard__actions">
              <button type="button" className="wizard__btn" onClick={() => setStep(1)}>
                חזור
              </button>
              <button type="button" className="wizard__btn wizard__btn--primary" onClick={goToStep3}>
                הבא
              </button>
            </div>
          </div>
        )}

        {/* שלב 3 — אישור */}
        {step === 3 && (
          <div className="wizard__body">
            <p className="wizard__summary">
              יוצר פרופיל <strong>{name.trim()}</strong> עם תבנית{' '}
              <strong>{selectedTpl?.nameHe}</strong>, גודל לוח{' '}
              <strong>{effectiveGrid.rows}×{effectiveGrid.cols}</strong>.
            </p>
            <p className="wizard__hint">{selectedTpl?.description}</p>
            <div className="wizard__actions">
              <button type="button" className="wizard__btn" onClick={() => setStep(2)}>
                חזור
              </button>
              <button
                type="button"
                className="wizard__btn wizard__btn--primary"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? 'יוצר…' : 'צור פרופיל'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
