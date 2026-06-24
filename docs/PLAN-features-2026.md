# תוכנית פיתוח — סבב פיצ'רים 2026-06

> נכתב 2026-06-24. מקור-אמת לתכנון הסבב. מתבסס על `PRD/PRD-he.md`, `HANDOFF.md`, `ARCHITECTURE.md`.
> מבוצע לפי פרוטוקול `EXECUTION-PROMPT.md` (תתי-סוכנים + סוכן-משפר רץ ברקע + עדכון HANDOFF בכל שינוי-התנהגות).
>
> **סטטוס סבב (2026-06-24):**
> - ✅ חלק 1 — גדלי לוח + Fitzgerald — **בוצע ונמזג ל-main**
> - ⏭ חלק 2 — חשבונות + פורטל — **דולג** (branch נפרד, לא נמזג)
> - ✅ חלק 3 — תמונות אישיות + פרטיות — **בוצע ונמזג ל-main**
> - ⏳ חלק 4 — שיפורים נוספים — **לא התחיל**
> - ⏳ חלק 5 — עיצוב מסך הגדרות — **לא התחיל**
>
> **DB_VERSION=10 · ≥308 tests · branch: main**

## הכרעות שהתקבלו מהמשתמש (סבב שאלות)
1. **אדמין** = אדמין-על מערכתי (אתה/הצוות). כל הרשמה ממתינה לאישור ידני לפני כניסה.
2. **קשר מבוגר↔ילד** = ילד הוא **תת-פרופיל תחת חשבון מבוגר**; כמה מבוגרים יכולים לחלוק גישה לאותו ילד.
3. **תמונות אישיות** = מקומי (offline-first) + **סנכרון מוצפן אופציונלי לענן**, מוגבל לפרופיל הילד.
4. **גדלי לוח** = **פריסטים מוכנים + טווח חופשי** (שורות×עמודות נפרד, לא-ריבועי).
5. **סדר ביצוע** = **חלק 1 = סעיפים 1+2** (גדלים + צבעי Fitzgerald); הבאקנד (3+4+5) במקביל אחר כך.

---

## מודל תתי-הסוכנים (לכל הסבב)
לפי `EXECUTION-PROMPT.md §1`:

| סוג עבודה | סוכן | מודל |
|-----------|------|------|
| חיפוש/איתור קוד | `Explore` | Haiku/Sonnet (זול) |
| תיקון קטן 1–2 קבצים | `general-purpose` (builder) | Sonnet |
| פיצ'ר/refactor מורכב | `Plan` (Opus) → builder (Sonnet) → reviewer (Opus) | בהתאם |
| מחקר/תיעוד | `general-purpose` | Sonnet |

**כללים:** הצינור המלא Opus→Sonnet→Opus רץ **רק** לעבודה לא-טריוויאלית. לעולם לא 3 סוכנים קרים לתיקון שורה.

### סוכן-משפר רץ ברקע (Continuous Improver)
- לאורך כל סבב — סוכן `general-purpose` (reviewer) ב-`run_in_background: true` שמבקר ברציפות את התוצרים האחרונים: איכות קוד, נכונות RTL, דיוק ניקוד/TTS, נגישות (WCAG 2.1 AA), כיסוי בדיקות, אבטחה/פרטיות.
- פותח משימות שיפור (TaskCreate) על **תוצרים משמעותיים בלבד** (חיסכון טוקנים).
- **כל אזהרה על הפרת אינווריאנט (למשל הזזת מילות ליבה) עוצרת ומועלית מיד.**

---

## חלק 1 — גדלי לוח + צבעי Fitzgerald ✅ בוצע ונמזג ל-main (2026-06-24)
> עצמאי מהבאקנד; quick win. סוכן: Plan(Opus)→builder(Sonnet)→reviewer(Opus). משפר רץ במקביל.

### 1A — גדלי לוח (FR-015) — *הרחבה, לא חדש*
**קיים:** `GridSizePicker.tsx` כבר תומך rows×cols נפרד (2–8), לא-ריבועי, עם guard `ViolationError` (ליבה לא נופלת). `domain/adaptivity.applyCellSize` → `boardEditor.resizeBoard`.
**פערים לסגור:**
- כפתורי **פריסטים** מהירים: `2×2, 3×3, 4×4, 3×5, 5×5, 6×6, 8×6, 8×8` (chips, RTL, aria-pressed).
- הרחבת טווח חופשי ל-**2–12** בכל ציר (PRD §11.1: 4×4→12×12); אכיפת גודל-מטרה מינ' (~1.5 ס"מ → חסימה/אזהרה אם יותר מדי תאים למסך).
- חשיפת בחירת גודל ב-**QuickStartWizard** (כיום התבניות בגודל קבוע) ובהגדרות הפרופיל.
**אינווריאנטים:** עקביות מיקום ליבה (אזהרה+חסימה דרך `ViolationError`); RTL; טסטים `adaptivity.test.ts`/`boardEditor.test.ts` ירוקים.
**תוצרים:** `GridSizePicker.tsx` (פריסטים+טווח), `adaptivity.ts` (אם צריך guard מטרה-מינ'), בדיקות, עדכון HANDOFF danger-zone + changelog.

### 1B — צבעי Fitzgerald קבועים עם חוקיות — *הקשחה + השלמה*
**מחקר (אומת באינטרנט — מקורות בתחתית):** המוצר אימץ **Modified Fitzgerald Key**. הכלל המרכזי: **הצבע נקבע ע"י הקטגוריה הדקדוקית של המילה והוא קבוע ועקבי בכל מסך** (זה המנגנון שמאיץ סריקה ורכישת תחביר).
**קיים:** `domain/fitzgerald.ts` — 8 קטגוריות, צבעים *רכים/מעומעמים* (PRD §6.1, הפחתת עומס חושי) + צמד `text` לניגודיות WCAG. החלטה מודעת לסטות מהצבעים הרוויים התקניים — נשמרת.
**מיפוי Modified Fitzgerald הקנוני (לעיון; כבר מיושם 8 מתוכם):**

| קטגוריה | צבע | סטטוס בקוד |
|----------|-----|------------|
| כינויי גוף/אנשים | צהוב | ✅ `pronoun` |
| פעלים | ירוק | ✅ `verb` |
| שמות עצם | כתום | ✅ `noun` |
| תארים | כחול | ✅ `adjective` |
| מילות יחס | ורוד | ✅ `preposition` |
| מילות שאלה | סגול | ✅ `question` |
| שלילה/חירום | אדום | ✅ `negation` |
| מילים חברתיות | מג'נטה | ✅ `social` |
| מילות קישור | לבן | ➕ להוסיף `conjunction` |
| תארי פועל | חום | ➕ להוסיף `adverb` |
| מיידעים/כמתים | אפור | ➕ להוסיף `determiner` |

**פערים לסגור:**
- הוספת 3 הקטגוריות החסרות (`conjunction`/`adverb`/`determiner`) ל-`Fitzgerald` type + `FITZGERALD` map (צבעים רכים תואמים, ניגודיות WCAG).
- **נעילת הצבעים כברירת מחדל** (קבועים, ללא עריכה ע"י המשתמש) — להבטיח עקביות. הוספת מקרא צבעים (legend) במצב מבוגר.
- **כלל אוטומטי (rule-based):** helper `categoryForLabel(label)` שמציע קטגוריית Fitzgerald אוטומטית לפי חלק-דיבר (ניתן לנצל מורפולוגיית Nakdan; fallback למילון ליבה). ה-builder יציע צבע אוטומטית, עם override ידני.
**אינווריאנטים:** ניגודיות WCAG 2.1 AA לכל זוג bg/text; עקביות (אותו צבע לאותה קטגוריה בכל מסך); צבעים רכים (לא רוויים).
**תוצרים:** `domain/fitzgerald.ts` (+3 קטגוריות), `domain/models.ts` (type), helper `categoryForLabel`, legend ב-`CellEditor`/`AccessSettingsPanel`, בדיקות (`fitzgerald.test.ts` כולל בדיקת ניגודיות), עדכון HANDOFF + PRD §6.3 changelog.

---

## חלק 2 — תשתית חשבונות, פורטל ואישור אדמין (סעיפים 3+4) ⏭ דולג — branch נפרד, לא נמזג
> תלוי-באקנד. Firebase Auth כבר קיים (M6). סוכן: Plan(Opus)→builder(Sonnet)→reviewer(Opus). יבוצע אחרי חלק 1 (או במקביל ב-worktree נפרד).
> **הערה:** בוצע בנפרד על `claude/accounts-parent-child-portal-dmxme7`; לא נמזג ל-main. חלק 3 יושם ללא תלות בחלק 2 (profileId במקום childId).

### 2A — התחברות + הרשמה + אישור אדמין (סעיף 4, FR-022/Auth)
**קיים:** `services/sync/authService.ts` (signIn/signUp/signOut/onAuthChange), `LoginPanel.tsx`, Firestore rules (uid-only).
**להוסיף:**
- **הרשמה מראש + אישור אדמין-על:** מצב חשבון `pending|approved|rejected` ב-Firestore (`users/{uid}.status`); משתמש לא-מאושר רואה מסך "ממתין לאישור" וחסום מתוכן. Firestore Rules אוכפות `status=='approved'` לקריאה/כתיבה של תוכן.
- **Google OAuth:** `signInWithPopup`/Redirect (Firebase Google provider) לצד email+password.
- **email+password עם וידוא סיסמה** (confirm field) + **אימות email** (`sendEmailVerification`) או **SMS** (Firebase Phone Auth) — אימות חובה לפני בקשת אישור.
- **מסך אדמין-על:** רשימת `pending`, אישור/דחייה (כתיבה ל-`status`). מוגן ב-custom claim `admin:true`.
**אינווריאנטים:** RBAC; הצפנה ב-transit (TLS) + at-rest; הודעות שגיאה בעברית; offline = חסימה חיננית (לא קריסה).
**תוצרים:** `authService` (Google/phone/verify/status), `RegisterPanel.tsx`, `PendingApprovalScreen.tsx`, `AdminApprovalPanel.tsx`, `firestore.rules` (status gate), בדיקות, HANDOFF.

### 2B — פורטל משתמשים + קשר מבוגר↔ילד (סעיף 3, FR-001/027/031)
**קיים:** `Profile` מקומי, ריבוי פרופילים, RBAC (`domain/access.ts`, `ROLE_CAN_EDIT`).
**להוסיף:**
- **חשבון מבוגר** (owner) עם **תתי-פרופילי ילד** בענן (`users/{uid}/children/{childId}`), בנוסף למקומי.
- **חלוקת גישה:** כמה מבוגרים לאותו ילד דרך הזמנה/קוד שיתוף (`childAccess` collection: childId↔uid↔role). מבוגר=parent/clinician (עורך), staff (use-only).
- **פורטל/דשבורד מבוגר:** רשימת ילדים, פרטי כל ילד, **העדפות לכל משתמש** (שם, גיל, קול ברירת-מחדל, גודל גריד מועדף, רמת עומס ויזואלי, נושאים מועדפים, מילים פעילות/מוסתרות, תוכנית התקדמות). הרחבת `Profile` בהתאם.
- הבחנת UI מבוגר↔ילד (קיימת בסיסית: locked mode) + מעבר מאובטח.
**אינווריאנטים:** מצב ילד נעול; פרטיות (הפרדה בין ילדים/מבוגרים); מחיקה=ארכוב; offline-first (פרופיל מקומי ממשיך לעבוד).
**תוצרים:** הרחבת `domain/models.Profile` (preferences), `data/childRepo` + sync, `presentation/portal/*` (Dashboard/ChildCard/Preferences/ShareInvite), Firestore rules per-child, בדיקות, HANDOFF.

---

## חלק 3 — תמונות אישיות + פרטיות בין משתמשים (סעיף 5, FR-005/006) ✅ בוצע ונמזג ל-main (2026-06-24)
> תלוי בחלק 2 (חשבונות). סוכן: builder(Sonnet)→reviewer(Opus).
> **תוצאה בפועל:** יושם ללא תלות בחלק 2 — `profileId` שמש כ-`childId`; Storage path: `profiles/{profileId}/media/{mediaId}`.
**קיים:** `services/image/imageService.ts` (crop/removeBackground/webp), העלאה/מצלמה ב-`CellEditor`, אחסון מקומי ב-IndexedDB (`symbolRepo`).
**להוסיף:**
- **צילום/העלאת תמונות אישיות** (בני משפחה וכו') כסוג תוכן לתא — כבר חלקית קיים; לוודא זרימת מצלמה+גלריה מלאה.
- **סנכרון מוצפן אופציונלי לענן** (Firebase Storage) מוגבל ל-`childId`; הצפנה client-side (להרחיב `services/sync/crypto.ts`). ברירת מחדל: מקומי; המבוגר מפעיל סנכרון.
- **הפרדת פרטיות:** Storage rules — קריאה/כתיבה רק ל-uids עם גישה ל-`childId`; אין דליפה בין ילדים/מבוגרים.
**אינווריאנטים:** offline-first (תמונות מקומיות עובדות ללא רשת); פרטיות (GDPR/COPPA/חוק הגנת הפרטיות); המבוגר שולט במה שעולה.
**תוצרים:** `data/mediaRepo` + sync, `services/sync/storageProvider`, Storage rules, UI הסכמה/הפעלה, בדיקות, HANDOFF.

---

## חלק 4 (סעיף 6) — הצעות לשיפור נוסף ⏳ לא התחיל
מועמדים (לבחירת המשתמש בהמשך; חלקם כבר ב-Roadmap Phase 2/3 ב-PRD):
1. **Auto-Nikud + מורפולוגיה עברית מלאה** (זכר/נקבה, יחיד/רבים, הומוגרפים) — שדרוג TTS (PRD §4.3).
2. **חבילת QA עברית מלאה** (PRD נספח C) כשער CI.
3. **דוחות התקדמות להורה** (MLU, פונקציות תקשורת) — FR-025/026.
4. **Voice Banking משפחתי** (הילד "נשמע" כמו אמא/אבא) — FR-032.
5. **VSD** (Visual Scene Displays) — FR-028.
6. **Transition to Literacy (T2L)** — אנימציה סמל→מילה כתובה (PRD §6.5).
7. **גישה חלופית** (Switch Scanning / eye-tracking) — נגישות מוטורית קשה (FR-036).
8. **שיתוף לוחות / קהילה** + ייבוא/ייצוא OBF (כבר קיים M18) להרחבה.
9. **PWA→Android** (Capacitor/TWA) ו-iPad (Phase 2).
10. **Onboarding הורה ידידותי** ("הוסף ילד → בחר רמה → התחל עם 12 מילים").

---

## Definition of Done (לכל חלק)
קוד עובד ✓ · בדיקות (unit+integration) ✓ · RTL+offline+נגישות ✓ · יעדי ביצועים ✓ · אינווריאנטים נשמרו ✓ · HANDOFF/docs/changelog עודכנו באותו commit ✓ · מעבר reviewer (Opus) ✓ · **דחיפה ל-main + דיפלוי לפיירבייס ✓** (ראה למטה).

## דחיפה ודיפלוי בסיום כל שלב (חובה)
**בסיום כל שלב** (כל תת-חלק שמסומן Done — 1A, 1B, 2A, …) יש:
1. לוודא ירוק מקומית: `npm run lint && npm test && npm run build` (ב-`app/`).
2. לעדכן `HANDOFF.md` (אינווריאנט+changelog) + docs רלוונטי **באותו commit**.
3. **לדחוף ל-`main`** (`git push origin main`; retry עם backoff על כשל רשת).
4. **דיפלוי לפיירבייס:** הדחיפה ל-`main` מפעילה אוטומטית את `.github/workflows/deploy.yml`
   (`npm ci → lint → test → build → firebase deploy --only hosting`). שער חוסם: כל כשל עוצר לפני deploy.
   - ודא ש-CI עבר ירוק וש-deploy הושלם (בדוק run ב-GitHub Actions).
   - אם נדרש סנכרון תוכן/Storage/Firestore — פרוס גם rules רלוונטיים (`firebase deploy --only firestore:rules,storage`).
   - Secrets נדרשים (כבר מוגדרים): `FIREBASE_SERVICE_ACCOUNT` + 6 × `VITE_FIREBASE_*`.
5. אם CI נכשל — תקן ודחוף מחדש לפני מעבר לשלב הבא (אל תשאיר main שבור).

## מקורות (מחקר Fitzgerald Key)
- [Fitzgerald Key for AAC — Communication Community](https://www.communicationcommunity.com/fitzgerald-key-for-aac/)
- [Colour coding — Smartbox Hub](https://hub.thinksmartbox.com/knowledgebase/colour-coding/)
- [Communication Boards: Colorful Considerations — PrAACtical AAC](https://praacticalaac.org/strategy/communication-boards-colorful-considerations/)
- [AAC Color Conventions — Smarty Symbols](https://smartysymbols.com/aac-color-conventions/)
- [Goossens', Crain & Elder color coding (OCALI PDF)](https://atinternetmodules.org/storage/ocali-ims-sites/ocali-ims-atim/documents/goosen_color_coding.pdf)

---

## חלק 5 — שדרוג עיצוב מסך ההגדרות (UI/UX redesign) ⏳ לא התחיל
> נוסף לבקשת המשתמש: ממשק הכניסה/ההגדרות נראה ישן ולא מודרני. סוכן: Plan(Opus)→builder(Sonnet)→reviewer(Opus), משפר רץ במקביל (דגש נגישות/RTL). **READ-heavy על UI בלבד — לא לשנות לוגיקת domain/services.**

### מצב קיים (אבחון)
- `presentation/settings/AccessSettingsPanel.tsx` — **inline styles** בכל מקום (אין מחלקות CSS); מודאל לבן יחיד שמערבב 3 נושאים שונים (גישה מוטורית + קול + rate/pitch) בלי קיבוץ.
- קלטים גולמיים: `<input type="checkbox">` ו-`<input type="range">` ללא עיצוב — נראה כמו טופס דפדפן ברירת-מחדל.
- כניסה דרך כפתור "הגדרות" ב-`presentation/components/AdultBar.tsx` — טקסט בלבד, ללא אייקון/אפקט.
- אין design tokens, אין Dark Mode/ניגודיות גבוהה (למרות ש-PRD §6.2/§4.7 דורשים), אין מצב full-screen sheet במובייל.

### יעד (החלטות מומלצות — בוצעו ללא שאלה, לפי הנחיית המשתמש)
1. **Design tokens** ב-`index.css` (CSS variables): צבעים (רקע/שטח/טקסט/accent), רדיוסים, צללים, מרווחים (scale 4/8/12/16/24), טיפוגרפיה (גדלים+משקלים). בסיס לכל ה-UI העתידי.
2. **רכיבי UI לשימוש חוזר** (`presentation/ui/`): `Toggle` (switch מודרני במקום checkbox), `Slider` (עם value-bubble), `Card`, `SectionHeader`, `Modal`/`Sheet`, `Button` (variants). מחליפים את ה-inline styles.
3. **ארגון מחדש של ההגדרות** למקטעים/טאבים עם אייקונים: **גישה מוטורית** · **קול ו-TTS** · **תצוגה** (ערכת נושא/Dark Mode/ניגודיות/גודל גופן/פונט דיסלקסיה — PRD §6.2) · **פרטיות וסנכרון** · **פרופיל**. הקטנת עומס קוגניטיבי (PRD §6.1).
4. **כניסה משופרת:** כפתור "הגדרות" ב-AdultBar עם אייקון גלגל-שיניים + מצב hover/focus ברור.
5. **רספונסיביות:** במובייל — bottom-sheet/full-screen; בדסקטופ — מודאל ממורכז עם sidebar מקטעים.
6. **Dark Mode + ניגודיות גבוהה** (PRD §4.7) דרך ה-tokens + `prefers-color-scheme` + toggle ידני.
7. **אנימציות עדינות** (fade/slide על פתיחה) — ללא הסחה לילד; מכבדות `prefers-reduced-motion`.

### אינווריאנטים
- **RTL מלא** בכל המקטעים. **WCAG 2.1 AA** (ניגודיות, focus visible, target ≥~1.5 ס"מ, ניווט מקלדת, aria roles/labels). **ללא שינוי לוגיקה** — רק presentation. ביצועים: פתיחה <200ms.

### תוצרים
`index.css` (tokens+מחלקות), `presentation/ui/*` (רכיבים), refactor של `AccessSettingsPanel.tsx` למקטעים, עדכון `AdultBar.tsx` (אייקון), בדיקות widget לרכיבים החדשים + בדיקת ניגודיות, עדכון HANDOFF (changelog) + `app/README.md` (מבנה presentation/ui). **DoD כולל דחיפה ל-main + דיפלוי לפיירבייס** (ראה למעלה).
