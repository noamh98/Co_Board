import { useState } from 'react';
import { listTemplates } from '../../domain/boardTemplates';
import { createProfileFromTemplate } from '../../data/bootstrap';

// ויזארד יצירת פרופיל חדש עם בחירת תבנית לוח.
// 3 שלבים: שם → בחירת תבנית → אישור ויצירה.
// RTL מלא. ניתן לסגור ב-X.

interface Props {
  onComplete: (profileId: string) => void;
  onClose: () => void;
}

const TEMPLATES = listTemplates();

export function QuickStartWizard({ onComplete, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('core4x4');
  const [creating, setCreating] = useState(false);

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
      );
      onComplete(profileId);
    })();
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

        {/* שלב 2 — בחירת תבנית */}
        {step === 2 && (
          <div className="wizard__body">
            <p className="wizard__hint">בחר תבנית לוח ראשונית:</p>
            <div className="wizard__templates">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`wizard__template-card${selectedTemplate === t.id ? ' wizard__template-card--selected' : ''}`}
                  onClick={() => setSelectedTemplate(t.id)}
                  aria-pressed={selectedTemplate === t.id}
                >
                  <strong className="wizard__template-name">{t.nameHe}</strong>
                  <span className="wizard__template-desc">{t.description}</span>
                </button>
              ))}
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
              <strong>{selectedTpl?.nameHe}</strong>.
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
