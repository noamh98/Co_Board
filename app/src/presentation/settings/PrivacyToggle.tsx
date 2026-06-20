// presentation/settings/PrivacyToggle.tsx — שליטת הורה: אילו נתונים עולים לענן.
// PRD §8.4: ברירת מחדל = לא עולה לענן ללא הסכמת הורה.

interface Props {
  syncEnabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function PrivacyToggle({ syncEnabled, onChange }: Props) {
  return (
    <section className="privacy-toggle" dir="rtl">
      <h3 className="privacy-toggle__title">פרטיות וסנכרון ענן</h3>
      <p className="privacy-toggle__desc">
        ברירת מחדל: נתוני הילד נשמרים <strong>מקומית בלבד</strong> במכשיר זה.
        הפעלת סנכרון תעלה לוחות ופרופילים לשרת המאובטח.
      </p>
      <label className="privacy-toggle__row">
        <input
          type="checkbox"
          checked={syncEnabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby="privacy-desc"
        />
        <span>הפעל סנכרון ענן (גיבוי אוטומטי בין מכשירים)</span>
      </label>
      <p id="privacy-desc" className="privacy-toggle__note">
        הנתונים מוצפנים לפני העלאה. ניתן לכבות בכל עת.
      </p>
    </section>
  );
}
