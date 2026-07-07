# 06 — Executive Summary / סיכום מנהלים

> Stage F output (charter Part 28). Date: 2026-07-07.
> Part 1 is Hebrew, Part 2 is English — same content, adapted per audience.
> Full evidence: [`00-discovery.md`](00-discovery.md) · [`01-audit.md`](01-audit.md) · [`02-ux-a11y-platforms.md`](02-ux-a11y-platforms.md) · [`03-privacy-security-family.md`](03-privacy-security-family.md) · [`04-media-ai.md`](04-media-ai.md) · [`05-roadmap.md`](05-roadmap.md).

---

# חלק 1 — עברית

## 1.1 שורה תחתונה

Co_Board **אינו אב-טיפוס ניסיוני** — זהו MVP בשל ובנוי היטב: ארכיטקטורה שכבתית קפדנית, ‎244+‎ בדיקות, offline-first אמיתי, הצפנת מדיה מקצה-לקצה, ואפילו סריקת מתגים (switch scanning) עובדת — יכולת שרוב מוצרי ה-AAC בשלב הזה לא מציעים. **ציון מוכנות כולל: 54/100** — כשהפער אינו איכות קוד אלא שכבות עסקיות/תפעוליות חסרות: חיוב, סביבת staging, ניטור, גיבוי מוכח, ומעל הכול — **ציות רגולטורי ופרטיות עבור דאטה של קטינים עם מוגבלויות**.

לצד זאת נמצאו **באגים אמיתיים וקריטיים** שחייבים תיקון לפני בטא סגורה, כי הבטא (10 משפחות + 3 קלינאיות) תפעיל אותם ביום הראשון.

## 1.2 ממצאים קריטיים (חוסמי בטא)

1. **שיתוף ילד עם קלינאית שבור מקצה-לקצה (D-01):** מסך קליטת ההזמנה מקבל רק קוד בן 6 ספרות בעוד השרת מייצר קוד hex בן 32 תווים — אי-אפשר לממש הזמנה דרך ה-UI; חוקי Firestore מעניקים גישה רק ל*מטא-דאטה* של הילד ולא ללוחות עצמם; וגם אם יתוקן — ההצפנה מונעת פענוח (ראו 2).
2. **מפתח הצפנה per-device ללא מנגנון שיתוף (D-02):** תמונות מסונכרנות לא ניתנות לפענוח בשום מכשיר אחר — לא של הורה שני, לא של קלינאית, לא של מכשיר חדש אחרי אובדן. כשל שקט (`null`), בלי הודעת שגיאה.
3. **"הילד מאבד את הקול" (R-03):** סנכרון ענן הוא opt-in, אין `navigator.storage.persist()‎`, גיבוי ידני בלבד — אובדן/איפוס מכשיר או פינוי אחסון של הדפדפן באנדרואיד זול = אובדן מוחלט של לוח תקשורת שנבנה שנים. אין ממצא חמור מזה במוצר AAC.
4. **אין נתיב הכנסות (B-02):** אפס קוד חיוב/מנויים. בנוסף, סמלי ARASAAC ברישיון NC (לא-מסחרי) — **בעיה משפטית אמיתית לגביית כסף** ללא רישוי סט סמלים מסחרי (E-04/R-16).

## 1.3 סיכונים גבוהים (עיקריים)

- **רגולציה (R-13):** אין מדיניות פרטיות, אין DPIA, אין החלטת רישום מאגר מידע — בזמן שהמערכת מחזיקה דאטה רגיש של קטינים. טקסט הדיבור המלא של הילד נשלח ל-Google TTS עם TODO משפטי פתוח (E-01).
- **הקלטות קול לא מוצפנות ולא מסונכרנות (E-03):** קול של סבתא שהוקלט — נמחק לנצח עם המכשיר.
- **דליפת EXIF/GPS בנתיב שגיאה של העלאת תמונה (E-02)** — מיקום של קטין.
- **גישה של קלינאית לעולם אינה פוקעת ואין ביטול (D-05) ואין audit log (D-08).**
- **אין איפוס סיסמה (D-04), אין מחיקת חשבון (D-03).**
- **Deploy ישיר ל-production בכל push ל-main, בלי staging ובלי rollback (B-01/R-19).**
- **רגרסיית נגישות מוטורית (C-04):** במסכי מובייל צרים המערכת דורסת את גודל התא שהוגדר למשתמש עם מוגבלות מוטורית ל-44px — בדיוק במכשירים הזולים שהם קהל היעד.
- **אובדן עריכות שקט בסנכרון (B-08):** עריכה מקבילה של הורה+קלינאית מוחקת צד אחד בלי התראה (ADR-0004 לא מומש).

## 1.4 סיכונים בינוניים (נבחרים)

אין ניטור/התראות בכלל (B-14) · אין App Check — סיכון עלות (B-23) · CSP עם unsafe-inline (D-07) · אין MFA למטפלים (D-06) · אין סינון תוכן על פלט AI לילדים (E-10) · רישוי Nakdan לא פתור + נקרא ישירות מהקליינט (E-05/E-12) · שתי מערכות design tokens סותרות (C-01) · אין onboarding בכלל (C-05) · חשש autoplay ב-iOS בהקשה ראשונה (C-08, דורש בדיקת מכשיר).

## 1.5 עשר העדיפויות המובילות

1. תיקון שיתוף מקצה-לקצה (D-01)
2. המשכיות מפתח הצפנה בין מכשירים (D-02)
3. רצפת אובדן-דאטה: persist + סנכרון default-on + הקלטות קול מוצפנות ומסונכרנות (B-10/B-11/E-03)
4. בסיס משפטי: מדיניות פרטיות, DPIA, מסלול רישום מאגר, סקירת E-01, ייחוס ARASAAC — **להתחיל בשבוע 1, זה התהליך הארוך** (D-09/B-04/E-04/E-05)
5. Staging + PITR + גיבויים + תרגול שחזור (B-01/B-12/B-13)
6. ניטור מינימלי תואם-פרטיות: dashboards + התראות + error tracking עם ניקוי PII (B-14/E-07)
7. איפוס סיסמה + ביטול גישה + רשימת "מי רואה את הילד שלי" (D-04/D-05)
8. תיקוני נגישות: C-04 (גודל מגע), C-02 (ניגודיות), ואז C-03 והצהרת נגישות (B-22/C-17)
9. חיוב + ישות משפחה + הכרעת רישוי סמלים לתשלום (B-02/E-04)
10. מיזוג per-field לסנכרון לפני 500 משתמשים (B-08/ADR-0004)

## 1.6 פעולות מומלצות 30/60/90 יום

- **30 יום:** עדיפויות 1–3 בפיתוח; עדיפות 4 נפתחת מול יועץ משפטי; staging חי; PITR מאומת; תיקון C-04/C-02; בדיקת iOS אמיתית (C-08).
- **60 יום:** סגירת שער הבטא (כל Phase 1), גיוס 10 משפחות + 3 קלינאיות, runbook תמיכה; התחלת design system ו-onboarding; החלטת ספק חיוב.
- **90 יום:** בטא רצה עם ניטור; חיוב v1 ב-staging; un-waiver של בדיקות axe; הצהרת נגישות; החלטת רישוי סמלים סגורה; תכנון Expo (router קודם).

## 1.7 Go/No-Go לפי אבן דרך

| אבן דרך | הכרעה | נימוק |
|---|---|---|
| **בטא סגורה** | **No-Go היום → Go אחרי Phase 1 (~6–8 שבועות)** | הבטא כוללת קלינאיות — והשיתוף שבור (D-01/D-02, ודאות מלאה). סיכון R-03 (אובדן לוח) לא קביל מול משפחות אמיתיות. אלה תיקונים תחומים וידועים — לא צריך יותר מציקל אחד. |
| **משפחה משלמת ראשונה** | **No-Go → Go אחרי Phase 2 (~סוף רבעון)** | אין קוד חיוב (B-02, ודאות); גביית כסף עם סמלי NC היא חשיפה משפטית (R-16); נדרשת מדיניות פרטיות בתוקף. בלי אלה — כל שקל שנגבה מגדיל חבות. |
| **500 משתמשים** | **No-Go → מותנה ב-Phase 4 המוקדם** | אישור ידני של כל נרשם (B-03) קורס לוגיסטית; הסתברות אובדן עריכות LWW (B-08) הופכת סטטיסטית ממשית; בלי App Check החשיפה הכספית גדלה ליניארית. |
| **פיילוט קליניקות** | **No-Go → Go בתוך Phase 5** | אין ישות ארגונית, אין audit log, אין offboarding לצוות (D-12/D-08/D-05) — שאלות הרכש הראשונות של כל קליניקה. פיילוט "ידני" עם 2–3 קלינאיות עצמאיות אפשרי מוקדם יותר, על בסיס שיתוף פר-ילד מתוקן. |
| **מכרז משרד החינוך / קופ"ח** | **No-Go — היעד הרחוק ביותר (אחרי Phase 5)** | דורש: חבילת ציות מלאה (DPIA, רישום, ממונה אבטחה), הצהרת נגישות AA בתוקף (תקן 5568), multi-tenancy ארגוני, MFA, ו-observability מוכח. כרגע ציון רגולציה 20/100 ו-Monitoring‏ 15/100. זה יעד שנה+, וזה בסדר — השוק הביתי/קליני בונה את הראיות למכרז. |

**מסר מסכם:** הקוד מוכן יותר מהעסק. עם צוות של 1–3 מפתחים, בטא סגורה אחראית אפשרית תוך חודשיים, ומשפחה משלמת ראשונה תוך רבעון — בתנאי שהעבודה המשפטית/רגולטורית מתחילה **השבוע**, כי היא המסלול הקריטי האמיתי.

---

# Part 2 — English

## 2.1 Bottom line

Co_Board is **not an experimental prototype** — it is a mature, well-engineered Hebrew-first AAC PWA: strict layered architecture, 244+ tests, genuine offline-first design, end-to-end-encrypted media, and a *working* switch-scanning implementation most AAC MVPs lack. **Overall readiness: 54/100**, and the gap is not code quality — it is missing business/ops layers (billing, staging, observability, proven backup) and, above all, **privacy/regulatory compliance for data of minors with disabilities**.

Alongside that, the audit found **real, verified critical bugs** that must be fixed before a closed beta, because the beta cohort (10 families + 3 SLPs) will hit them on day one.

## 2.2 Critical findings (beta blockers)

1. **Child-sharing is broken end-to-end (D-01):** the invite-redemption UI accepts only 6-digit numeric codes while the backend generates 32-char hex codes; Firestore rules grant shared members access to child *metadata* only, never the boards; and even after both fixes, encryption blocks decryption (next item).
2. **Per-device, non-shareable encryption key (D-02):** synced photos silently fail to decrypt (`null`) on any second device — second parent, clinician, or a replacement device after loss.
3. **"The child loses their voice" (R-03):** cloud sync is opt-in, `navigator.storage.persist()` is never called, backups are manual — device loss or browser storage eviction on a low-end Android means total, permanent loss of a years-in-the-making communication board. Nothing is more severe in an AAC product.
4. **No revenue path (B-02):** zero billing/subscription code; additionally ARASAAC symbols are CC BY-NC-SA (NonCommercial) — **a genuine legal problem for charging money** without licensing a commercial symbol set (E-04/R-16).

## 2.3 High risks (headline items)

- **Regulatory exposure (R-13):** no privacy policy, no DPIA, no database-registration decision — while holding sensitive minors' data. Every uncached utterance a child taps is sent verbatim to Google TTS under an open legal TODO (E-01).
- **Voice recordings are plaintext, local-only, never synced (E-03)** — a recorded grandparent's voice dies with the device.
- **EXIF/GPS leak on the image-upload error path (E-02)** — a minor's location.
- **Clinician access never expires; no revocation, no audit log (D-05/D-08).**
- **No password reset (D-04); no account deletion / right to erasure (D-03).**
- **Every push to `main` deploys straight to production — no staging, no rollback runbook (B-01/R-19).**
- **Motor-accessibility regression (C-04):** on narrow mobile screens, a caregiver's deliberately enlarged touch targets are silently overridden down to 44px — on exactly the low-cost Android devices this product targets.
- **Silent concurrent-edit loss in sync (B-08):** parent+therapist editing the same board drops one side's changes without warning (ADR-0004 unimplemented).

## 2.4 Medium risks (selected)

No production observability at all (B-14) · no App Check — cost-abuse exposure (B-23) · CSP still allows `unsafe-inline` (D-07) · no MFA for clinicians (D-06) · no content filter on child-facing AI output (E-10) · Nakdan licensing unresolved and called unproxied from the client (E-05/E-12) · two contradictory design-token systems loaded simultaneously (C-01) · no onboarding/tutorial whatsoever (C-05) · plausible iOS first-tap autoplay break (C-08, needs device verification).

## 2.5 Top 10 priorities

1. Fix sharing end-to-end (D-01)
2. Cross-device encryption-key continuity (D-02)
3. Data-loss floor: `persist()` + sync default-on + encrypted, synced voice recordings (B-10/B-11/E-03)
4. Legal baseline: privacy policy, DPIA, database-registration track, E-01 review, ARASAAC attribution — **start week 1; it is the true critical path** (D-09/B-04/E-04/E-05)
5. Staging + PITR + backups + restore drill (B-01/B-12/B-13)
6. Privacy-compatible minimal observability: dashboards + alerts + PII-scrubbed error tracking (B-14/E-07)
7. Password reset + access revocation + "who can see my child" list (D-04/D-05)
8. Accessibility fixes: C-04 (target size), C-02 (contrast), then C-03 + accessibility statement (B-22/C-17)
9. Billing + family entity + paid-tier symbol-license decision (B-02/E-04)
10. Per-field sync merge before 500 users (B-08/ADR-0004)

## 2.6 Recommended next actions — 30/60/90 days

- **30 days:** priorities 1–3 in development; priority 4 opened with counsel; staging live; PITR verified; C-04/C-02 fixed; real-iOS verification pass (C-08).
- **60 days:** close the beta gate (all of Phase 1); recruit 10 families + 3 SLPs; support runbook; design-system and onboarding work starts; billing-provider decision.
- **90 days:** beta running with monitoring; billing v1 on staging; axe waivers removed; accessibility statement published; symbol-licensing decision closed; Expo planning starts (router migration first).

## 2.7 Go/No-Go per milestone

| Milestone | Verdict | Justification |
|---|---|---|
| **Closed beta** | **No-Go today → Go after Phase 1 (~6–8 weeks)** | The beta includes SLPs — and sharing is broken with certainty (D-01/D-02). R-03 (total board loss) is not an acceptable risk to expose real families to. All gate items are bounded, known fixes — one focused cycle. |
| **First paying family** | **No-Go → Go after Phase 2 (~one quarter)** | No billing code exists (B-02, certain); charging money atop NC-licensed symbols is legal exposure (R-16); a published privacy policy is a precondition for taking payment data. Until then, every shekel collected increases liability. |
| **500 users** | **No-Go → conditional on early Phase 4** | Manual per-signup admin approval (B-03) collapses operationally; LWW edit-loss probability (B-08) becomes statistically real; without App Check, financial exposure grows linearly with accounts. |
| **Clinic pilots** | **No-Go → Go within Phase 5** | No org entity, no audit log, no staff offboarding (D-12/D-08/D-05) — the first three questions any clinic's procurement asks. A *manual* pilot with 2–3 independent SLPs is feasible earlier on fixed per-child sharing. |
| **MoE / HMO tender** | **No-Go — farthest gate (post-Phase 5)** | Requires the full compliance package (DPIA, registration, security officer), a valid AA accessibility statement (תקן 5568), organizational multi-tenancy, MFA, and proven observability. Current Regulatory score: 20/100; Monitoring: 15/100. This is a year-plus goal — appropriately so; the family/clinic market builds the evidence base a tender demands. |

**Closing message:** the code is more ready than the business. With a 1–3 dev team, a responsible closed beta is achievable within two months and a first paying family within a quarter — provided the legal/regulatory workstream starts **this week**, because it, not engineering, is the true critical path.

---

*End of document — 06-executive-summary.md.*
