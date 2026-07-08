// AccessibilityStatement — הצהרת נגישות v1 (C-17) לפי ת"י 5568 (WCAG 2.0 AA).
//
// מוצג כסקשן בתוך פאנל ההגדרות (.settings-panel) ולכן מכוסה ע"י סריקת axe
// הקיימת (settings-a11y.spec.ts). התוכן המשפטי המחייב מנוסח בטיוטה ומסומן
// [TBD — counsel] במסמך המלא (docs/accessibility-statement.md).
//
// רכיב תצוגה טהור — ללא state, ללא רשת, ללא any.

export function AccessibilityStatement() {
  return (
    <section className="settings-section" aria-labelledby="s-accessibility">
      <div className="settings-section__header">
        <span className="settings-section__icon" aria-hidden="true">♿</span>
        <h3 className="settings-section__title" id="s-accessibility">
          הצהרת נגישות
        </h3>
      </div>
      <div className="settings-section__body">
        <p className="a11y-statement__level">
          <strong>רמת התאמה:</strong> התאמה חלקית לתקן הישראלי ת"י 5568
          (המאמץ את WCAG 2.0 רמה AA).
        </p>
        <p className="a11y-statement__desc">
          ‏Co_Board מחויבת להנגשת המוצר לכלל המשתמשים, ובכללם אנשים עם מוגבלות.
          מרבית קריטריוני ההצלחה מתקיימים — מבנה ARIA ללוח, ניווט מקלדת וסריקת
          מתגים, יעדי מגע גדולים, גופן קריא, מצב רגיעה חושית והקראה קולית עברית.
          כלל ניגודיות הצבע (WCAG 1.4.3) עומד כעת ב-4.5:1 בכל הערכות ונאכף
          אוטומטית בבדיקות הנגישות, ללא ויתורים (waivers).
        </p>
        <div className="a11y-statement__known" role="note">
          <strong>מגבלה ידועה:</strong> טרם הושלם אישור פורמלי מלא לתאימות AA —
          נוסח סטטוטורי מחייב וזהות רכז/ת הנגישות ממתינים להשלמה משפטית, ומטריצת
          הבדיקה בטכנולוגיות מסייעות (קוראי-מסך, מתגי-סריקה) על מכשירים פיזיים
          עדיין בתהליך. עד להשלמתם ההצהרה מנוסחת כ"התאמה חלקית".
        </div>
        <p className="a11y-statement__feedback">
          נתקלתם ברכיב שאינו נגיש? נשמח למשוב. פרטי רכז/ת הנגישות ודרכי הפנייה
          מפורטים בהצהרת הנגישות המלאה של השירות.
        </p>
      </div>
    </section>
  );
}
