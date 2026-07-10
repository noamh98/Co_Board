# ROADMAP-STATUS — מעקב ביצוע מול `05-roadmap.md`

> עודכן: 2026-07-10. מקור אמת לביצוע: היסטוריית ה-commits + הקוד. עדכנו מסמך זה בכל PR שסוגר משימת roadmap.

## Phase 1 — MVP Hardening (שער: Closed Beta)

| # | משימה | ממצא | סטטוס |
|---|-------|-------|--------|
| 1.1 | תיקון שיתוף-ילד end-to-end | D-01 | ✅ בוצע (PRs #27, #36) |
| 1.2 | המשכיות-מפתח רב-מכשירית ל-E2EE | D-02 | 🟡 **ADR-0006 נכתב** ([adr-0006-key-continuity.md](adr-0006-key-continuity.md)); מימוש ממתין לסקירת-סכימה (R-22) |
| 1.3 | רצפת אובדן-נתונים: persist() + sync default-on + nudge | B-10, B-11 | ✅ בוצע (PRs #30, #31) |
| 1.4 | הקלטות קול → הצפנה+סנכרון | E-03 | ✅ בוצע (2026-07-10, ענף program-implementation-review) |
| 1.5 | הבטחת EXIF stripping בכל המסלולים | E-02 | ✅ בוצע (PR #29) |
| 1.6 | איפוס סיסמה | D-04 | ✅ בוצע (PR #32) |
| 1.7 | ביטול-גישה (revocation) + expiresAt | D-05 | ✅ בוצע (PR #33) |
| 1.8 | סביבת staging (פרויקט Firebase שני) | B-01, B-15/16/24 | ❌ **דורש קונסולת Firebase** — לא ניתן לביצוע מקוד בלבד |
| 1.9 | Observability מינימלי (dashboards, error tracking) | B-14, E-07 | ❌ דורש קונסולה + החלטת פרטיות (Sentry/GlitchTip) |
| 1.10 | PITR + exports + bucket versioning + restore drill | B-12, B-13 | ❌ **דורש קונסולת Firebase/gcloud** |
| 1.11 | תיקון touch-targets מובייל + ניגודיות | C-04, C-02 | ✅ בוצע (PR #34 + #48) |
| 1.12 | בסיס משפטי: מדיניות פרטיות, DPIA, רישוי סמלים/Nakdan | B-04, D-09, E-01/04/05 | 🟡 חלקי: Nakdan env-gate קיים (`VITE_NAKDAN_ENDPOINT`); ייחוס ARASAAC ב-UI קיים; **מדיניות פרטיות/ToS/DPIA/רישוי — דורש יועץ משפטי** |
| 1.13 | היגיינת docs + runbook תמיכה | D-15 ועוד | ✅ בוצע (PR #35) |
| 1.14 | בדיקת iOS על מכשיר אמיתי (autoplay, eviction) | C-08 | ❌ **דורש מכשיר iPhone פיזי** |

## Phase 2 — UX Overhaul + Design System + Billing (שער: First Paying Family)

| # | משימה | סטטוס |
|---|-------|--------|
| 2.1–2.11 | כל משימות Phase 2 (טוקנים, ARIA, design system, onboarding, billing skeleton, iOS PWA, play-safety, QR share, switch-debounce, הצהרת נגישות, bundle budget) | ✅ בוצעו במלואן (PRs #39–#47 + #48) |

הערה: 2.5 (billing) הוא skeleton — checkout אמיתי מול Stripe/Paddle ממתין להחלטת ספק + רישוי סמלים (E-04, יועץ).

## Phase 3 — Native + Family model + Media v2

| # | משימה | ממצא | סטטוס |
|---|-------|-------|--------|
| 3.1 | Router + deep-link invite links | B-07 | ✅ בוצע (PR #49) |
| 3.2 | אפליקציית Expo (פורט native) | §18.1 | ❌ XL — פרויקט בפני עצמו; לא להתחיל במקביל ל-3.3 עם <3 מפתחים |
| 3.3 | מודל משפחה ורב-תפקידים v1 | D-12, D-13 | ❌ XL — קיים עוגן `families/{familyId}` בלבד (מ-2.5) |
| 3.4 | יומן ביקורת (auditLog) | D-08 | ✅ בוצע (PR #50) |
| 3.5 | מדיה v2 (מצלמה in-app, bg-removal, NSFW) | E-08, E-11 | ❌ ממתין (L) |
| 3.6 | Voice bank (VoiceClip, trim, wizard) | E-13, C-11 | ❌ ממתין (L); התשתית (E-03 סנכרון מוצפן) הושלמה |
| 3.7 | MFA לקלינאים/צוות | D-06 | ❌ דורש שדרוג Identity Platform בקונסולה |
| 3.8 | שלמות ייצוא: מדיה+קול בגיבוי | D-10 | ✅ בוצע (2026-07-10, backupFormat 2) |

## Phase 4 — Scale (שער: 500→5,000)

| # | משימה | ממצא | סטטוס |
|---|-------|-------|--------|
| 4.1 | Per-field merge sync | B-08 | ❌ ממתין (ADR-0004 מוצע) |
| 4.2 | Self-serve signup | B-03 | ❌ ממתין (החלטת מוצר) |
| 4.3 | App Check | B-23 | ❌ דורש קונסולה + אישור בעל-מוצר (עלות reCAPTCHA) |
| 4.4 | Revision history + trash UI | B-09, B-20 | ❌ ממתין |
| 4.5 | SLO instrumentation | Part 12 | ❌ תלוי 1.9 |
| 4.6 | CSP nonce · Nakdan proxy · rate-limit TTL | D-07, E-12, E-15 | 🟡 E-15 ✅ (expiresAt, 2026-07-10; נותר להפעיל TTL policy ב-gcloud); D-07/E-12 ממתינים |
| 4.7 | פילטר תוכן AI + סניטציית topic | E-10, E-06 | ✅ בוצע (2026-07-10, contentFilter.ts) |
| 4.8 | Feature flags | B-17 | ✅ בוצע (2026-07-10, config/flags + featureFlags.ts) |
| 4.9 | Cost guardrails (budget alerts, TTS pre-gen) | E-07 | ❌ דורש קונסולת Billing |

## Phases 5–6 — Institutional + Regional

לא התחילו (org tenancy, dual-custody, compliance package, voice cloning gated, i18n) — תלויות מוצר/משפט/היקף. ראו `05-roadmap.md`.

## מה חסום ועל מה (סיכום למי שממשיך)

- **קונסולת Firebase/GCP:** 1.8 (staging), 1.9 (monitoring), 1.10 (PITR/exports/versioning), 3.7 (Identity Platform/MFA), 4.3 (App Check), 4.9 (budget alerts), הפעלת TTL policy ל-rateLimits (`gcloud firestore fields ttls update expiresAt --collection-group=rateLimits --enable-ttl`).
- **יועץ משפטי:** 1.12 (מדיניות פרטיות/ToS/DPIA/רישום מאגר, רישוי ARASAAC-מסחרי/SymbolStix, Nakdan/Dicta, E-01 TTS).
- **חומרה:** 1.14 (iPhone אמיתי — C-08 autoplay, eviction).
- **סקירת קריפטו:** מימוש 1.2 (D-02) לפי ADR-0006.
- **החלטות מוצר:** 2.5 ספק billing; 4.2 self-serve; 3.2/3.3 איוש (XL).
