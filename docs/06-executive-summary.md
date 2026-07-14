# 06 — סיכום מנהלים (Executive Summary)

> Stage F · 2026-07-14 · Architect (Opus) · מסמך מנהלים המסכם את docs/00–05.
> מזהי-ממצאים (B-xx / C-xx / D-xx / S-x / P-x / T-x / E-xx) מפנים למסמכי הביקורת המפורטים לצורך מעקב.

---

## חלק א' — עברית

### תמונת מצב במשפט אחד

Co_Board הוא מוצר AAC עברי **בנוי היטב מבחינה הנדסית** (קוד באיכות ייצור, offline-first אמיתי, אבטחה בסיסית טובה, 244+ בדיקות) — אבל **עדיין לא מוכן כעסק**: חסרות שכבות התשלום, המולטי-טננט (מרפאות/בתי ספר), הרגולציה (חוק הגנת הפרטיות, נגישות), הניטור וה-DR, ולכן אי אפשר עדיין לקחת לקוח משלם באופן חוקי ובטוח.

### 5 הממצאים הקריטיים ביותר — מה זה אומר בשבילך

1. **אין דרך לקבל כסף** (B-02). אין שום קוד של חיוב/מנוי. בשבילך: היום אי אפשר להפוך אף משפחה ללקוח משלם — צריך לבנות חיוב (Stripe/Paddle) ו"ישות משפחה" לחיוב.
2. **אי אפשר למחוק מידע לבקשת הורה** (P-1). "ארכוב" זה לא מחיקה — המידע נשאר בענן. בשבילך: השקה חוקית עם מידע של קטינים **אסורה** בלי כפתור מחיקה אמיתי. זה חוסם רגולטורי, לא רק טכני.
3. **ילד עלול לאבד את הקול שלו** (B-11, B-10). הסנכרון לענן הוא opt-in, ואין הגנה מפני מחיקת האחסון המקומי בטלפון. בשבילך: אם ההורה לא הפעיל סנכרון והמכשיר אבד/נמחק — הלוח שנבנה במשך שנים נעלם לצמיתות. זו כשל קיומי למוצר AAC.
4. **שיתוף תמונות עם קלינאי/מכשיר שני פשוט לא עובד** (D-02). מפתח ההצפנה קשור למכשיר יחיד ואין החלפת-מפתחות. בשבילך: פיצ'ר הדגל "שתף לוח עם הקלינאית" נכשל בשקט על תמונות — נכשל בבטחה (לא דולף), אבל שבור.
5. **טקסט רגיש נשלח לספקים חיצוניים בלי אישור משפטי** (P-2, E-01, E-04, E-05). מה שהילד "אומר" נשלח ל-Google TTS; הניקוד ל-Dicta (רישיון אקדמי לא-מסחרי); והסמלים של ARASAAC הם ברישיון **לא-מסחרי** — כלומר עצם הגבייה כסף מפר את הרישיון. בשבילך: כל אלה חייבים אישור עורך-דין לפני השקה בתשלום.

### עלות חודשית לפי כמות משתמשים (מ-docs/01-audit.md, Part 16)

| משתמשים | עלות חודשית (ללא Nakdan) | עלות למשתמש/חודש |
|---|---|---|
| 100 | ~$34–40 | ~$0.35–0.40 |
| 500 | ~$63–75 | ~$0.13–0.15 |
| 1,000 | ~$114–130 | ~$0.11–0.13 |
| 10,000 | ~$570–620 | ~$0.06 |

**המסקנה:** התשתית **אינה** המגבלה — אפילו ב-10,000 משתמשים ההוצאה מתחת ל-$650/חודש, והעלות למשתמש **יורדת** עם הגדילה. מנוע העלות המשתנה העיקרי הוא TTS (Google), לא אחסון. **הנעלם הגדול היחיד: רישוי Nakdan** (`[TBD]` — אין תמחור פומבי, ADR-0005) — חייבים לפתור מול Dicta לפני גדילה מעבר לביתא. עלות "נסתרת" נוספת: שעות-אדם של אישור-משתמשים ידני, שלא מופיעה בחשבון הענן אבל גדלה עם מספר המשתמשים (B-03).

### מה חוסם אותך מלקוח משלם ראשון — רשימה ישירה

- **חובה לבנות:** מנגנון חיוב + ישות משפחה (B-02); פונקציית מחיקת-חשבון `eraseAccount` (P-1); סנכרון-כברירת-מחדל + `storage.persist()` (B-11, B-10); תיקון החלפת-מפתחות למדיה (D-02).
- **חובה לפתור משפטית:** סקירת עו"ד לזרימות TTS/ניקוד/Gemini (P-2); רישוי ARASAAC לגרסה בתשלום + שורת ייחוס עכשיו (E-04); רישוי Nakdan או חסימת-סביבה עם מילון מקומי (E-05).
- **חובה לפרסם:** מדיניות פרטיות + תנאי שימוש + הצהרת נגישות + DPIA חתום (B-04, P-5).
- **מומלץ בחום לפני משפחות אמיתיות ללא ליווי:** מעקב שגיאות בסיסי (B-14) + סביבת staging (B-01) + אימות PITR/גיבויים (B-12, B-13).

### Go / No-Go לכל אבן דרך

| אבן דרך | סטטוס | מה חסר |
|---|---|---|
| ביתא סגורה (10 משפחות + 3 קלינאיות) | 🟡 GO מותנה | מעקב שגיאות (B-14), מיזוג-סנכרון או UI-קונפליקט (B-08/C-18), `storage.persist()` (B-10), אימות PITR (B-12) |
| לקוח משלם ראשון | 🔴 NO-GO | חיוב (B-02), מחיקה (P-1), אישור משפטי P-2/E-04/E-05, DPIA + מדיניות (B-04) |
| 500 משתמשים | 🔴 NO-GO | מיזוג פר-שדה (B-08/C-18), הסרת צוואר-הבקבוק הידני (B-03), מודל הרשאות scope/expiry/audit (S-2/S-3/S-4) |
| פיילוטים במרפאות | 🔴 NO-GO | ישויות מרפאה/בי"ס (T-1), MFA לאנשי מקצוע (S-1), לוג ביקורת (S-4) |
| מכרז משרד החינוך / קופ"ח | 🔴 NO-GO (הרחוק ביותר) | כל הנ"ל + רישום מאגר/ממונה אבטחה/נוהל אבטחה (P-5), הערכת DPO תיקון 13 (P-6), התאמה מלאה WCAG 2.2 AA (C-01…C-13), הסכמת שני-הורים (P-4) |

### 10 העדיפויות הראשונות (בסדר ביצוע)

1. חיוב + ישות משפחה + מחיקת-חשבון (B-02, T-1, P-1).
2. סקירות משפטיות: טקסט לספקים, ARASAAC, Nakdan (P-2, E-04, E-05) — להתחיל היום, זמן-ההובלה הארוך ביותר.
3. סנכרון כברירת-מחדל + `storage.persist()` (B-11, B-10) — התשואה הכי גבוהה למאמץ.
4. תיקון החלפת-מפתחות למדיה (D-02) — מפעיל את "שתף עם קלינאית".
5. DPIA + מדיניות פרטיות + תנאי שימוש + הצהרת נגישות (B-04, P-5).
6. staging + מעקב שגיאות + PITR/גיבויים (B-01, B-14, B-12/B-13).
7. תיקון ניגודיות + מבנה grid-ARIA (C-01, C-02) — מסיר את שני חוסמי ה-AA.
8. הרשמה עצמית מדורגת + App Check (B-03, C-14, S-6).
9. מיזוג פר-שדה + הרשאות scope/expiry/audit (B-08/C-18, S-2/S-3/S-4).
10. מולטי-טננט + הסכמת שני-הורים + חבילת ציות ישראלית (T-1, P-4, P-5, P-6).

### תוכנית 30/60/90 יום בקצרה

- **30 יום:** להתחיל את כל התהליכים המשפטיים במקביל לקוד; לכפות שתי החלטות בעל-מוצר (App Check, Sentry-מול-פרטיות); תיקונים זולים ובעלי-ערך גבוה (`storage.persist()`, EXIF E-02, ניגודיות C-01, theme-color/apple-meta C-06/C-07); להתחיל חיוב + משפחה + מחיקה; להקים staging.
- **60 יום:** תיקון D-02 + סנכרון-מוצפן להקלטות קול (E-03); סנכרון כברירת-מחדל (B-11); תיקון grid-ARIA (C-02); מעקב שגיאות + דשבורדים + התראות תקציב (B-14, E-07); PITR + גרסאות אחסון + תרגול שחזור; לחתום DPIA ולפרסם מדיניות/נגישות (B-04, P-5).
- **90 יום:** להשלים הרשמה עצמית + App Check (B-03, S-6); UI סל-מיחזור (B-20); סינון פלט AI (E-10, E-06); להתחיל מיזוג פר-שדה (B-08) והרשאות (S-2/S-3/S-4). יעד: ביתא רצה, משפחה משלמת ראשונה, מסלול ברור ל-100 משתמשים.

### ציון מוכנות כולל: 60 / 100

מוצר הנדסי טוב באמת (מימדי הקוד 74–82) שנמשך מטה על-ידי המימדים התפעוליים/רגולטוריים/ניטור (22–35) שמוצר מסחרי המחזיק מידע של קטינים עם מוגבלות **חייב**. Phase 1 לבדו אמור להעלות ל-~72; התוכנית המלאה מכוונת ל-~88. הציון נמוך במכוון למרות הקוד החזק, כי המימדים החלשים הם אלה שבלעדיהם ההשקה **לא חוקית** (רגולציה, מחיקה) או שילד **מאבד את קולו** (אמינות).

---

## Part B — English

### One-line status

Co_Board is an **engineering-grade** Hebrew AAC product (production-quality code, genuine offline-first, decent security baseline, 244+ tests) that is **not yet ready as a business**: it lacks the billing, multi-tenant (clinic/school), regulatory (Israeli Privacy Law + accessibility), observability, and DR layers required to lawfully and safely take a paying customer.

### The 5 most critical findings — what it means for you

1. **No way to take money** (B-02). Zero billing/subscription code. You cannot convert any family to a paying customer today; you must build billing (Stripe/Paddle) + a `families` billing entity.
2. **Cannot delete a family's data on request** (P-1). "Archive" ≠ delete; data persists in the cloud. A lawful launch with minors' data is impossible without a real erasure function — a regulatory blocker, not just a technical gap.
3. **A child can lose their voice** (B-11, B-10). Cloud sync is opt-in and there is no storage-persistence guard on the device. If sync was never enabled and the device is lost/reset, a years-in-the-making board is gone permanently — an AAC-existential failure.
4. **Photo sharing with a therapist / second device silently fails** (D-02). The media encryption key is device-bound with no key exchange. The flagship "share a board with a therapist" feature fails to decrypt photos — it fails *safe* (no leak), but it is broken.
5. **Sensitive text reaches third parties without legal sign-off** (P-2, E-01, E-04, E-05). What the child "says" goes to Google TTS; nikud to Dicta (academic, non-commercial endpoint); ARASAAC symbols are **NonCommercial**-licensed, so charging money itself violates the license. All require counsel review before a paid launch.

### Monthly cost by scale (from docs/01-audit.md Part 16)

| Users | Monthly cost (excl. Nakdan) | Per-user/month |
|---|---|---|
| 100 | ~$34–40 | ~$0.35–0.40 |
| 500 | ~$63–75 | ~$0.13–0.15 |
| 1,000 | ~$114–130 | ~$0.11–0.13 |
| 10,000 | ~$570–620 | ~$0.06 |

**Takeaway:** infrastructure is not the constraint — even at 10,000 users total cloud spend is under $650/mo and per-user cost *falls* with scale (fixed costs dominate at low volume). The dominant variable cost is TTS (Google), not storage. The single largest unknown is **Nakdan licensing** (`[TBD]`, no public pricing, ADR-0005) — resolve with Dicta before scaling past beta. A hidden non-cloud cost is the labor of manual user approval, which scales with users (B-03).

### What blocks your first paying customer — concrete list

- **Must build:** billing + family entity (B-02); `eraseAccount` Cloud Function (P-1); sync default-on + `navigator.storage.persist()` (B-11, B-10); media key-exchange fix (D-02).
- **Must resolve legally:** counsel review of TTS/nikud/Gemini text flows (P-2); ARASAAC license for paid tier + ship attribution now (E-04); Nakdan license or per-env gate with local dictionary (E-05).
- **Must publish:** privacy policy + ToS + accessibility statement + signed DPIA (B-04, P-5).
- **Strongly recommended before unsupervised real families:** minimal error tracking (B-14) + staging project (B-01) + verified PITR/backups (B-12, B-13).

### Go / No-Go per milestone

| Milestone | Status | What's missing |
|---|---|---|
| Closed beta (10 families + 3 SLPs) | 🟡 Conditional GO | Error tracking (B-14), per-field merge or conflict UI (B-08/C-18), `storage.persist()` (B-10), PITR verified (B-12) |
| First paying family | 🔴 NO-GO | Billing (B-02), erasure (P-1), legal sign-off P-2/E-04/E-05, DPIA + policies (B-04) |
| 500 users | 🔴 NO-GO | Per-field merge (B-08/C-18), remove manual bottleneck (B-03), role scope/expiry/audit (S-2/S-3/S-4) |
| Clinic pilots | 🔴 NO-GO | Clinic/school tenant entities (T-1), MFA for professionals (S-1), audit log (S-4) |
| MoE/HMO tender | 🔴 NO-GO (furthest) | All above + database registration/security officer/procedure (P-5), Amendment-13 DPO assessment (P-6), full WCAG 2.2 AA (C-01…C-13), dual-parent consent (P-4) |

### Top 10 priorities (execution order)

1. Billing + family entity + account erasure (B-02, T-1, P-1).
2. Legal reviews: third-party text, ARASAAC, Nakdan (P-2, E-04, E-05) — start now; longest lead time.
3. Sync default-on + `storage.persist()` (B-11, B-10) — highest reliability-per-effort.
4. Media key-sharing fix (D-02) — enables "share with therapist".
5. DPIA + privacy policy + ToS + accessibility statement (B-04, P-5).
6. Staging + error tracking + PITR/backups (B-01, B-14, B-12/B-13).
7. Contrast + grid-ARIA fixes (C-01, C-02) — removes the two AA blockers.
8. Tiered self-serve onboarding + App Check (B-03, C-14, S-6).
9. Per-field merge + role scope/expiry/audit (B-08/C-18, S-2/S-3/S-4).
10. Multi-tenant + dual-parent consent + Israeli compliance pack (T-1, P-4, P-5, P-6).

### 30/60/90-day plan (brief)

- **30 days:** start all legal/process items in parallel with code; force the two product-owner decisions (App Check cost/UX, Sentry-vs-privacy); ship cheap high-value fixes (`storage.persist()` B-10, EXIF E-02, contrast C-01, theme-color/apple-meta C-06/C-07); begin billing + family + erasure; stand up staging (B-01).
- **60 days:** land D-02 media-key fix + encrypted voice sync (E-03); sync default-on (B-11); grid-ARIA fix (C-02); error tracking + dashboards + budget alerts (B-14, E-07); PITR + storage versioning + restore drill (B-12, B-13); sign DPIA + publish policies (B-04, P-5).
- **90 days:** complete tiered onboarding + App Check (B-03, S-6); trash UI (B-20); AI output filter + prompt sanitization (E-10, E-06); begin per-field merge (B-08) and role/scope/expiry/audit (S-2/S-3/S-4). Target: beta running, first paying family, clear path to 100 users.

### Overall readiness score: 60 / 100

A genuinely well-built engineering artifact (code dimensions 74–82) dragged down by the operational, regulatory, and monitoring dimensions (22–35) that a commercial product handling minors' disability data must have. Phase 1 alone should move this to ~72; the full roadmap targets ~88. The score is deliberately not higher despite strong code, because the low-scoring dimensions are precisely the ones that, unaddressed, make a launch either unlawful (Regulatory, Privacy erasure) or capable of letting a child lose their voice (Reliability). Privacy and accessibility are weighted as tier-1 per the charter.

---

*Trace any cited finding ID (B-/C-/D-/S-/P-/T-/E-) back to docs 01–04 for full impact, root cause, and complexity. Full roadmap, risk register, and scorecard in docs/05-roadmap.md. Items marked `[Assumption]`/`[TBD]` in source docs remain unresolved.*
