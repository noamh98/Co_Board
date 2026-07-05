# לוח תקשורת — אפליקציית AAC עברית

אפליקציית **תקשורת תומכת וחליפית (AAC)** עברית-ראשונה לילדים עם קשיי תקשורת (דגש אוטיזם), לקלינאי תקשורת והורים. מסחרי · Android + Web (PWA) תחילה, iPad בהמשך.

> **סטטוס:** בפיתוח פעיל. ה-MVP בנוי (PWA — React+TS+Vite) ועבר סבבי רפקטור והקשחה (Phase 2–3). מצב עדכני: `docs/reviews/HANDOFF.md` §7; היסטוריה מלאה: `docs/CHANGELOG.md`.

## מבנה ה-repo
```
.
├── PRD/
│   ├── PRD-he.md          # אפיון מלא (עברית, ראשי) — מקור האמת
│   └── PRD-en.md          # גרסה אנגלית מקבילה
├── app/                   # אפליקציית ה-PWA (React + TS + Vite) — ראה app/README.md
├── functions/             # Firebase Functions (ttsProxy, aiBoard, invites, rate-limit)
├── docs/                  # ADRs, פירוט per-milestone, CHANGELOG, verification
│   └── reviews/HANDOFF.md # סקירת פרויקט + אינווריאנטים — לקרוא בתחילת כל סשן
├── CLAUDE.md              # תקציר לסוכני Claude Code: פקודות + אינווריאנטים
├── ARCHITECTURE.md        # דיאגרמת מודולים + טבלת אחריות + גבולות
├── EXECUTION-PROMPT.md    # פרומפט הבנייה המקורי (היסטורי)
├── CONNECT-GITHUB.md      # הוראות דחיפה חד-פעמיות (היסטורי)
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
| `EXECUTION-PROMPT.md` | פרומפט הבנייה המקורי (היסטורי — ה-MVP כבר נבנה) | הקשר היסטורי בלבד |

## מאיפה להתחיל
1. קראו את `docs/reviews/HANDOFF.md` (2 דקות).
2. להרצה: `cd app && npm install && npm run dev`.
3. לבניית פיצ'ר: עקבו אחרי `EXECUTION-PROMPT.md`.

## עיקרי המוצר
- עברית עמוקה: RTL, ניקוד אוטומטי + override, מורפולוגיה, TTS עברי היברידי.
- שני מצבי UX: הורה פשוט / קלינאי עוצמתי.
- Offline-first; Builder מודרני עם עריכה קבוצתית; מדידה קלינית מובנית.

---
*נבנה כאיחוד מקצועי של 4 מסמכי מחקר על שוק ה-AAC. מתוחזק ב-git לפי פרוטוקול HANDOFF.*
