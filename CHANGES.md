# Co_Board — CHANGES (חבילת מימוש Phase 0+1+2 + שלדי Phase 3–5)

> נוצר ב-Copilot Cowork בעדשת **Ponytail** (מינימום שעובד, בלי לוותר על ולידציה/שגיאות/אבטחה/נגישות).
> כל הקבצים ממוקמים בנתיבי-הפרויקט האמיתיים — חלצו את ה-ZIP לשורש ה-repo.
> סדר החלה + חיווטי-App.tsx + secrets + קריטריוני-קבלה: ראו `Claude-Code-Integration-Prompt.md`.

**אינווריאנטים נשמרו:** offline-first · שום מפתח צד-שלישי ב-bundle · interfaces של `ttsProvider`/`aiProvider`
ללא שינוי · צבעי Fitzgerald לא נגעו · ארכיטקטורת domain/data/services/presentation · TS strict · RTL-first.

**מקרא:** 🆕 חדש · ♻️ מעודכן · ⚠️ שלד/stub (Phase 3–5)

---

## Phase 0 — בטיחות וייצוב (חוסם השקה)

| קובץ | סוג | מה | למה |
|---|---|---|---|
| `functions/src/rateLimit.ts` | 🆕 | מגביל-קצב פר-uid (fixed-window מעל Firestore) | חוסם חיוב בלתי-מוגבל (H-KEY) |
| `functions/src/ttsProxy.ts` | 🆕 | onCall ל-Google TTS; מחזיק המפתח; auth+approved+quota+timeout 15s | מפתח לא ב-bundle/IDB (CR-1) |
| `functions/src/aiBoard.ts` | 🆕 | onCall ליצירת-לוח (action=generate); edit=stub | מפתח/endpoint AI בשרת; timeout+quota (CR-2) |
| `functions/src/index.ts` | ♻️ | export ל-ttsProxy + aiBoard | — |
| `functions/package.json` | ♻️ | Node 22→20 | יישור drift (H-CD) |
| `app/src/services/tts/functionsTtsProvider.ts` | 🆕 | `TTSProvider` שקורא ל-ttsProxy; base64→Blob | שומר interface; fallback browser נשמר |
| `app/src/services/tts/ttsWiring.ts` | 🆕 | `createTtsProvider()` — מצמצם שינוי App.tsx לשורה | Ponytail |
| `app/src/services/ai/aiProvider.ts` | ♻️ | קורא ל-aiBoard onCall במקום fetch ישיר; אותו `GeneratedWord[]` | מפתח AI בשרת (CR-2) |
| `app/src/services/sync/crypto.ts` | ♻️ | E2EE **fail-loud** (throw, לא base64); `getDeviceId` דרך IDB | אין "הצפנה" הפיכה בשקט (CR-3) |
| `app/src/data/deviceId.ts` | 🆕 | deviceId ב-IDB + מיגרציה חד-פעמית מ-localStorage | מבטל split-brain במצב פרטי (CR-6) |
| `app/src/data/syncMeta.ts` | ♻️ | `recordLocalWrite` עם deviceId אסינכרוני מ-IDB | תקינות LWW (CR-6) |
| `app/src/data/boardRepo.ts` | ♻️ | `archive()` → `recordLocalWrite`; core מוחרג מ-outbox | לוחות מאורכבים מסתנכרנים (CR-4) |
| `app/src/services/sync/syncEngine.ts` | ♻️ | `setLastSyncAt` רק בסיום נקי (הועבר ל-runSync) | אין סטיית-נתונים שקטה (H-SYNC) |
| `app/src/data/settingsRepo.ts` | ♻️ | הסרת מפתח TTS מ-IDB (getTtsApiKey=no-op, מוחק legacy) | אין מפתח בלקוח (CR-1) |
| `firebase.json` | ♻️ | CSP connect-src: `*.cloudfunctions.net`/`*.run.app`; הוסר texttospeech ישיר | proxy בלבד; AI endpoint לא נחשף ללקוח |
| `.github/workflows/deploy.yml` | ♻️ | CD פורס `hosting,firestore:rules,storage,functions` (gated על טסטים); Node 20 | סוף ל-rules drift (H-CD) |
| `app/src/data/boardRepo.test.ts` | 🆕 | טסט: archive→outbox round-trip; core מוחרג | רגרסיה (CR-4) |
| `app/src/data/deviceId.test.ts` | 🆕 | טסט: IDB יציב + מיגרציה legacy | רגרסיה (CR-6) |
| `app/src/services/sync/crypto.failLoud.test.ts` | 🆕 | טסט: encrypt זורק כש-subtle חסר | רגרסיה (CR-3) |
| `app/src/services/sync/syncEngine.lastSync.test.ts` | 🆕 | טסט: push כושל → lastSyncAt לא מתקדם | רגרסיה (H-SYNC) |

**חיווט App.tsx ידני** (App.tsx לא נכלל — מתפרק ב-Phase 3): החלפת יצירת ה-TTS provider ב-`createTtsProvider()`,
הסרת UI מפתח-TTS, `primeDeviceId()` ב-bootstrap. פרטים מדויקים ב-Integration-Prompt.

---

## Phase 1 — Quick Wins

| קובץ | סוג | מה | למה |
|---|---|---|---|
| `app/src/data/db.ts` | ♻️ | DB_VERSION 11→12: אינדקסים `OUTBOX.by-updatedAt`+`VERSIONS.by-entity`; store `aiBoardCache` | אין סריקה מלאה; cache (E/F2) |
| `app/src/data/syncQueue.ts` | ♻️ | `peek` דרך אינדקס by-updatedAt | מבטל getAll+sort בנתיב חם |
| `app/src/data/aiBoardCache.ts` | 🆕 | cache ללוחות AI לפי hash(topic+grid) | מונע LLM חוזר; "דקה" (F2) |
| `app/src/services/ai/boardGenerator.ts` | ♻️ | enrichment **Promise.all** (במקום N+1 טורי) | latency ↓ פי 10–30 (F2) |
| `app/src/services/http/fetchWithTimeout.ts` | 🆕 | `fetchWithTimeout(url,init,15000)` (AbortController) | אין UI תקוע (G/H-API) |
| `app/src/services/nikud/nakdanClient.ts` | ♻️ | קריאה דרך fetchWithTimeout | timeout (H-API) |
| `app/src/services/image/imageService.ts` | ♻️ | אומת: אין דליפת blob-URL (revoke קיים) | מניעת leak (D) |
| `app/src/services/analytics/analyticsService.ts` | ♻️ | `SettingsRepo` נבנה פעם אחת (lazy singleton) | פחות tx פר-לחיצה (D) |
| `app/src/data/audioCache.ts` | ♻️ | `lastAccessedAt` נכתב רק אם ישן מ-60ש' (debounce) | פחות tx בנתיב חם (D) |
| `app/src/services/sync/storageProvider.ts` | ♻️ | de-dup קונפיג Firebase → `getFirebaseConfig()` | מקור-אמת יחיד (A) |
| `app/src/presentation/auth/translateFirebaseError.ts` | 🆕 | מיפוי שגיאות Firebase יחיד | de-dup (B) |
| `app/src/presentation/auth/LoginPanel.tsx` | ♻️ | משתמש ב-translateFirebaseError | de-dup (B) |
| `app/src/presentation/auth/RegisterPanel.tsx` | ♻️ | משתמש ב-translateFirebaseError | de-dup (B) |
| `app/src/domain/accessSettings.ts` | ♻️ | שדות F7: preventSequentialDuplicates, cellImageScale, sentenceButtonScale | הגדרות אמיתיות |
| `app/src/domain/sentence.ts` | 🆕 | `appendWord(sentence,cell,preventDup)` — reducer-guard טהור | מניעת-כפילויות (F7) |
| `app/src/domain/sentence.test.ts` | 🆕 | טסט מניעת-כפילויות | F7 |
| `app/src/services/http/fetchWithTimeout.test.ts` | 🆕 | טסט timeout/abort | H-API |
| `app/src/data/audioCache.debounce.test.ts` | 🆕 | טסט: לא נכתב פעמיים בחלון | D |

**חיווט App.tsx ידני:** הוספת מילה לשורה דרך `appendWord(s, cell, accessSettings.preventSequentialDuplicates)`.

---

## Phase 2 — מוצר/UX ליבה (ריברנד קורל)

| קובץ | סוג | מה | למה |
|---|---|---|---|
| `app/src/presentation/ui/tokens.css` | 🆕 | ריברנד קורל: chrome (--cl-*) + dark + ניגודיות-גבוהה + אריח תווית-למעלה + utility classes | זהות עיצוב (F6). Fitzgerald לא נגוע |
| `app/src/main.tsx` | ♻️ | מייבא tokens.css *אחרי* index.css | מקור-אמת יחיד מנצח |
| `app/src/presentation/components/CellButton.tsx` | ♻️ | תווית-למעלה (CSS order); `--cell-img-scale` מההגדרות | אריח נאמן + F7 |
| `app/src/presentation/components/BoardToolbar.tsx` | 🆕 | סרגל 5 כפתורים (הדפסה·השמעה·מחיקה·ניקוי·בית) + ARIA | חילוץ מ-App.tsx (F6) |
| `app/src/presentation/wizard/NewBoardChooser.tsx` | 🆕 | משפך 3 מסלולים (תבנית/אפס/AI), AI מומלץ | פער Emorli #1 (F1) |
| `app/src/presentation/wizard/SmartCreatePanel.tsx` | 🆕 | "יצירה חכמה" hero — עוטף boardGenerator + cache + מצבי-משוב | AI כמסך-ראשי (F1) |
| `app/src/presentation/print/BoardPrintView.tsx` | 🆕 | תצוגת A4 RTL נקייה (גריד תווית+סמל) | ייצוא PDF (F3) |
| `app/src/presentation/print/print.css` | 🆕 | print-stylesheet נייטיב | Ponytail (F3) |
| `app/src/domain/boardTemplates.ts` | ♻️ | +5 תבניות נושאיות (בוקר טוב/שתייה/מה אני רוצה/בית/משחקים) — data-driven, קטגוריה מהמילון הקנוני, ניקוד ע"י השירות (ללא המצאה) | אַסֵט תוכן (F5) |
| `app/src/presentation/settings/AccessSettingsPanel.tsx` | ♻️ | toggle מניעת-כפילויות + 2 סליידרי-גודל + ARIA (גם ל-ttsRate/ttsPitch) | F7 + נגישות (K) |
| `app/src/presentation/components/BoardToolbar.test.tsx` | 🆕 | טסט נגישות/התנהגות | F6 |
| `app/src/presentation/wizard/NewBoardChooser.test.tsx` | 🆕 | טסט 3 מסלולים | F1 |

**חיווט App.tsx ידני:** הוספת `<BoardToolbar/>` + `<BoardPrintView/>`, משפך `<NewBoardChooser/>`→`<SmartCreatePanel/>`.
**נדחה במכוון:** פלטת צבע-רקע פר-לוח (דורשת שדה `Board.backgroundColor` + render — לא לשלוח UI חצי-מחווט).

---

## Phase 3–5 — שלדים + stubs (לא להפעיל אוטומטית) ⚠️

| קובץ | Phase | מה |
|---|---|---|
| `app/src/presentation/state/useAccessSettings.ts` | 3 | חילוץ hook ראשון (ממומש) לפירוק App.tsx |
| `app/src/presentation/state/README.md` | 3 | תוכנית פירוק App.tsx + scaffolds נותרים |
| `app/src/data/migrationFlag.ts` | 3 | דגל כשל-מיגרציה (למיגרציית v8→cursor) |
| `app/src/data/backupValidation.ts` | 3 | type-guards ל-importBackup (לחווט ב-backupRepo) |
| `app/src/services/ai/aiBoardEditor.ts` | 4 | `editBoard` — stub עד שחוזה ה-patch ייקבע (אטום) |
| `app/src/presentation/builder/AiEditPanel.tsx` | 4 | UI עריכה שיחתית מעל ה-stub |
| `docs/adr-0004-conflict-per-field.md` | 5 | מודל קונפליקט per-field |
| `docs/adr-0005-nikud-licensing.md` | 5 | רישוי Dicta + גידור env |

---

## הנחות / לאימות אנושי
- **אזור Functions `europe-west1`** — לאמת רגולציה (COPPA/GDPR) מול היועמ"ש (מופיע כ-TODO בקוד).
- **פרומפט/מודל ה-AI אטומים** — ה-proxy משכפל את חוזה-הקריאה הקיים `{topic,count}→{words}`; לא הומצא דבר.
  עריכת-AI (F4) ו-model-routing מסומנים TODO עד שהחוזה ייחשף.
- **ניתוב מודלים** למימוש עצמו: Phase 0/1 בוצעו ברובן ברמת Sonnet; crypto/סינתזה/אבטחה ב-Opus.
