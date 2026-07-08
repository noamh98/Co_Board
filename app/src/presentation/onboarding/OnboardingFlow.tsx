// presentation/onboarding/OnboardingFlow.tsx — הדרכת פתיחה (C-05) + תזכורת קוד הורה (C-10).
//
// מוצג פעם אחת בהפעלה הראשונה (ראו useAppBootstrap/settingsRepo). ניתן לדילוג בכל שלב.
// אינו חוסם לצמיתות את "לחיצה ראשונה תמיד מדברת" (A3): המבוגר מדלג פעם אחת לפני
// מסירת המכשיר לילד, וההתמדה מבטיחה שההדרכה לא תחזור. הרכיב אינו מדבר ואינו נוגע ב-TTS.
//
// שלבים: (0) בחירת פרסונה — משפחה/מטפל/בית ספר; (1–3) סיור נעול/מבוגר/בונה;
// (4) תזכורת קוד הורה — רק אם אין קוד מוגדר (C-10).

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { OnboardingPersona } from '../../data/settingsRepo';

interface OnboardingFlowProps {
  /** האם כבר מוגדר קוד הורה — אם לא, מוצג שלב תזכורת (C-10). */
  hasCaregiverPin: boolean;
  /** נקרא בסיום/דילוג עם הפרסונה שנבחרה (או null אם דולג לפני בחירה). */
  onComplete: (persona: OnboardingPersona | null) => void;
  /** פתיחת ההגדרות להגדרת/שינוי קוד הורה. */
  onOpenPinSettings: () => void;
}

const PERSONAS: { id: OnboardingPersona; label: string; hint: string }[] = [
  { id: 'family', label: 'משפחה', hint: 'הורה או בן/בת משפחה' },
  { id: 'therapist', label: 'מטפל/ת', hint: 'קלינאי/ת תקשורת, מרפא/ה בעיסוק' },
  { id: 'school', label: 'צוות בית ספר', hint: 'מורה או סייע/ת' },
];

const TOUR: { title: string; body: string }[] = [
  {
    title: 'מצב משתמש (נעול)',
    body: 'הלוח פתוח לילד/ה. כל לחיצה על תא מדברת מיד — גם ללא אינטרנט.',
  },
  {
    title: 'מצב מבוגר',
    body: 'לחיצה ארוכה על המנעול פותחת ניהול: ספריית לוחות, הגדרות ופרופילים.',
  },
  {
    title: 'בונה הלוחות',
    body: 'במצב מבוגר אפשר ליצור ולערוך לוחות — להוסיף תאים, תמונות וקטגוריות.',
  },
];

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.55)',
  padding: '1rem',
};

const cardStyle: CSSProperties = {
  background: 'var(--cl-surface, #ffffff)',
  color: 'var(--cl-text, #12211b)',
  borderRadius: 'var(--radius-lg, 16px)',
  width: '100%',
  maxWidth: 460,
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '1.5rem',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '0.75rem',
  marginBottom: '0.75rem',
};

const titleStyle: CSSProperties = { fontSize: '1.35rem', margin: 0, fontWeight: 700 };
const bodyStyle: CSSProperties = { fontSize: '1.05rem', lineHeight: 1.5, margin: '0 0 1.25rem' };

const skipStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--cl-primary-dk, #155F47)',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  padding: '0.25rem 0.5rem',
  whiteSpace: 'nowrap',
  minHeight: 44,
};

const primaryBtnStyle: CSSProperties = {
  background: 'var(--cl-primary-dk, #155F47)',
  color: '#ffffff',
  border: 'none',
  borderRadius: 'var(--radius-md, 10px)',
  padding: '0.75rem 1.5rem',
  fontSize: '1.05rem',
  fontWeight: 600,
  cursor: 'pointer',
  minHeight: 48,
};

const secondaryBtnStyle: CSSProperties = {
  background: 'transparent',
  color: 'var(--cl-primary-dk, #155F47)',
  border: '2px solid var(--cl-primary-dk, #155F47)',
  borderRadius: 'var(--radius-md, 10px)',
  padding: '0.75rem 1.25rem',
  fontSize: '1.05rem',
  fontWeight: 600,
  cursor: 'pointer',
  minHeight: 48,
};

const personaColStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' };

const personaBtnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.15rem',
  background: 'var(--cl-surface-2, #f2f6f4)',
  color: 'inherit',
  border: '2px solid var(--cl-primary-dk, #155F47)',
  borderRadius: 'var(--radius-md, 10px)',
  padding: '0.85rem 1rem',
  fontSize: '1.05rem',
  cursor: 'pointer',
  textAlign: 'start',
  minHeight: 56,
};

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
};

export function OnboardingFlow({
  hasCaregiverPin,
  onComplete,
  onOpenPinSettings,
}: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<OnboardingPersona | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // שלב אחרון: אם אין קוד הורה מוסיפים שלב תזכורת (4), אחרת הסיור מסתיים בשלב 3.
  const lastStep = hasCaregiverPin ? 3 : 4;

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onComplete(persona);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [persona, onComplete]);

  const selectPersona = (id: OnboardingPersona): void => {
    setPersona(id);
    setStep(1);
  };

  const next = (): void => {
    if (step >= lastStep) onComplete(persona);
    else setStep((s) => s + 1);
  };

  const title =
    step === 0
      ? 'ברוכים הבאים ל-Co-Board'
      : step >= 1 && step <= 3
        ? TOUR[step - 1].title
        : 'קוד הורה';

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      data-testid="onboarding"
      ref={cardRef}
      tabIndex={-1}
      dir="rtl"
    >
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h2 id="onboarding-title" style={titleStyle}>
            {title}
          </h2>
          <button
            type="button"
            style={skipStyle}
            data-testid="onboarding-skip"
            onClick={() => onComplete(persona)}
          >
            דלג על ההדרכה
          </button>
        </div>

        {step === 0 && (
          <div>
            <p style={bodyStyle}>נשמח להכיר — מי ישתמש ב-Co-Board? כך נתאים את ההדרכה.</p>
            <div style={personaColStyle}>
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  style={personaBtnStyle}
                  data-testid={`onboarding-persona-${p.id}`}
                  onClick={() => selectPersona(p.id)}
                >
                  <span style={{ fontWeight: 700 }}>{p.label}</span>
                  <span style={{ opacity: 0.75, fontSize: '0.9rem' }}>{p.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step >= 1 && step <= 3 && (
          <div>
            <p style={bodyStyle}>{TOUR[step - 1].body}</p>
            <div style={footerStyle}>
              <span style={{ opacity: 0.7, fontSize: '0.9rem' }} aria-hidden="true">
                {step}/{lastStep}
              </span>
              <button
                type="button"
                style={primaryBtnStyle}
                data-testid="onboarding-next"
                onClick={next}
              >
                {step === lastStep ? 'סיום ההדרכה' : 'המשך'}
              </button>
            </div>
          </div>
        )}

        {!hasCaregiverPin && step === 4 && (
          <div>
            <p style={bodyStyle}>
              מומלץ להגדיר קוד הורה כדי להגן על מצב מבוגר (עריכה, הגדרות ומחיקה). אפשר גם מאוחר יותר,
              דרך ההגדרות.
            </p>
            <div style={footerStyle}>
              <button
                type="button"
                style={secondaryBtnStyle}
                data-testid="onboarding-pin-later"
                onClick={() => onComplete(persona)}
              >
                אחר כך
              </button>
              <button
                type="button"
                style={primaryBtnStyle}
                data-testid="onboarding-pin-set"
                onClick={() => {
                  onOpenPinSettings();
                  onComplete(persona);
                }}
              >
                הגדרת קוד הורה
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
