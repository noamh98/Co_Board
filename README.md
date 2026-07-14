# לוח תקשורת — אפליקציית AAC עברית

אפליקציית **תקשורת תומכת וחליפית (AAC)** עברית-ראשונה לילדים עם קשיי תקשורת (דגש אוטיזם), לקלינאי תקשורת והורים. מסחרי · Android + Web (PWA) תחילה, iPad בהמשך.

> **סטטוס:** בפיתוח פעיל. ה-MVP בנוי (PWA — React+TS+Vite), **244 בדיקות עוברות**, שלב נוכחי M22 (TTS היברידי). היסטוריה מלאה: `docs/CHANGELOG.md`.

## מבנה ה-repo
```
.
├── PRD/
│   ├── PRD-he.md          # אפיון מלא (עברית, ראשי) — מקור האמת
│   └── PRD-en.md          # גרסה אנגלית מקבילה
├── app/                   # אפליקציית ה-PWA (React + TS + Vite) — ראה app/README.md
├── docs/                  # ADRs, per-milestone, CHANGELOG, verification + 00-06: audit SaaS מלא (ראה docs/README.md)
├── docs/reviews/HANDOFF.md  # סקירת פרויקט + אינווריאנטים — לקרוא בתחילת כל סשן
├── ARCHITECTURE.md        # דיאגרמת מודולים + טבלת אחריות + גבולות
├── EXECUTION-PROMPT.md    # פרומפט בנייה (תהליך + תתי-סוכנים + בדיקות)
├── CONNECT-GITHUB.md      # הוראות דחיפה חד-פעמיות (היסטורי)
├── COBOARD_TASK.md        # אמנת ה-audit (SaaS transformation) — מקור להנחיות docs/00-06
├── *.docx                 # 4 מסמכי המחקר המקוריים
└── README.md
```

## תוכן עניינים — "מה לקרוא ומתי"
| מסמך | תיאור | מתי |
|------|-------|-----|
| `docs/reviews/HANDOFF.md` | סקירה + אינווריאנטים + danger zones + open questions | **תחילת כל סשן** (2 דק') |
| `ARCHITECTURE.md` | מבנה 4-שכבות, דיאגרמת mermaid, גבולות תקשורת | כשנוגעים במבנה/מודולים |
| `PRD/PRD-he.md` | אפיון מוצר מלא (12 סעיפים, FR-001…037) | להבנת דרישה/פיצ'ר |
| `app/README.md` | התקנה והרצה (dev/test/build) | להרצת הקוד |
| `docs/CHANGELOG.md` | היסטוריית כל המיילסטונים | להבין מה כבר נבנה |
| `docs/adr-*.md` | החלטות ארכיטקטורה (stack, sync) | להבין "למה כך" |
| `docs/m*.md` | פירוט per-milestone | לעומק על פיצ'ר ספציפי |
| `EXECUTION-PROMPT.md` | פרוטוקול עבודה (סוכנים, בדיקות, תיעוד) | לבניית פיצ'ר חדש |
| `docs/00-discovery.md` … `docs/06-executive-summary.md` | **Audit SaaS מלא**: ארכיטקטורה נוכחית, code/DB/security/privacy review, UX+a11y+cross-platform, roadmap, risk register, סיכום מנהלים (עברית+אנגלית) | להבין את התוכנית להפוך למוצר מסחרי — התחילו מ-`docs/06-executive-summary.md`; אינדקס מלא ב-`docs/README.md` |

## מאיפה להתחיל
1. קראו את `docs/reviews/HANDOFF.md` (2 דקות) — למי שממשיך פיתוח שוטף.
2. לבעל/ת המוצר: קראו את `docs/06-executive-summary.md` — תמונת מצב עסקית + Go/No-Go + עלויות.
3. לביצוע ה-roadmap: `docs/05-roadmap.md`.
4. להרצה: `cd app && npm install && npm run dev`.
5. לבניית פיצ'ר: עקבו אחרי `EXECUTION-PROMPT.md`.

## עיקרי המוצר
- עברית עמוקה: RTL, ניקוד אוטומטי + override, מורפולוגיה, TTS עברי היברידי.
- שני מצבי UX: הורה פשוט / קלינאי עוצמתי.
- Offline-first; Builder מודרני עם עריכה קבוצתית; מדידה קלינית מובנית.

---
*נבנה כאיחוד מקצועי של 4 מסמכי מחקר על שוק ה-AAC. מתוחזק ב-git לפי פרוטוקול HANDOFF.*
