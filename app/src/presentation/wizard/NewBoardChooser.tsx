// presentation/wizard/NewBoardChooser.tsx — משפך כניסה אחיד ל"לוח חדש" (F1, פער Emorli #1).
// שלושה מסלולים שווי-ערך: בחירה מתבנית · יצירה מאפס · יצירה עם AI (מומלץ, hero).
// Ponytail: רכיב יחיד קטן — רק בורר; הלוגיקה (יצירה בפועל) נשארת בקוראים הקיימים.

export type NewBoardMethod = 'template' | 'scratch' | 'ai';

export interface NewBoardChooserProps {
  onChoose: (method: NewBoardMethod) => void;
}

interface Choice {
  method: NewBoardMethod;
  icon: string;
  title: string;
  desc: string;
  recommended?: boolean;
}

const CHOICES: Choice[] = [
  { method: 'template', icon: '🧩', title: 'בחירה מתבנית', desc: 'התחילו מלוח מוכן.' },
  { method: 'scratch', icon: '⬚', title: 'יצירה מאפס', desc: 'לוח ריק לבנייה ידנית.' },
  { method: 'ai', icon: '✨', title: 'יצירה עם AI', desc: 'תארו — והמערכת בונה.', recommended: true },
];

export function NewBoardChooser({ onChoose }: NewBoardChooserProps) {
  return (
    <div className="new-board-chooser" dir="rtl" role="group" aria-label="איך תרצו ליצור את הלוח?">
      {CHOICES.map((c) => (
        <button
          key={c.method}
          type="button"
          className={`choice${c.recommended ? ' choice--ai' : ''}`}
          onClick={() => onChoose(c.method)}
          aria-label={`${c.title} — ${c.desc}${c.recommended ? ' (מומלץ)' : ''}`}
        >
          {c.recommended && <span className="choice__rec">מומלץ</span>}
          <span className="choice__icon" aria-hidden="true">{c.icon}</span>
          <h3 className="choice__title">{c.title}</h3>
          <p className="choice__desc">{c.desc}</p>
        </button>
      ))}
    </div>
  );
}
