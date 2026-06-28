# פרומפט המשך — קומיט/דיפלוי סופי + בדיקת קול נשי בעברית

הדבק בסשן Claude Code/VS Code פתוח על `C:\PROJECTS\Co_Board` (**לא** מהסנדבוקס של Cowork — סשן עם build/git/Firebase עובדים).

---

## קונטקסט
בוצעה בדיקת QA ממוקדת בדפדפן על https://co-board--phase-i-bugfix-iuejvxox.web.app, לאחר תיקון 3 באגים קודמים. שני באגים (חיזוי מילים, dropdown סריקת שורות-עמודות) אומתו כ-PASS. הבאג השלישי (לופ `speechSynthesis.speak()`) התגלה כ-**לא פתור באמת** — התיקון הקודם (`synth.cancel()` ואז `synth.speak()` באותו tick) יצר באג חדש: תקיעת מנוע הדיבור של Chrome ב-`speaking=true` לנצח, עם "ניסיון חזרה" שקט בקצב ~1/שנייה — זה מה שנשמע כ"האפליקציה לא מפסיקה להגיד דברים".

**התיקון כבר בוצע וכתוב בדיסק** ב-`app/src/services/tts/ttsService.ts`: דחיית הקריאה ל-`this.synth.speak(u)` ל-tick הבא (`setTimeout(fn, 0)`) אחרי `this.synth.cancel()`. נוסף טסט רגרסיה ל-`ttsService.test.ts`. `tsc --noEmit` נקי, 14/14 טסטי TTS עברו (מהסנדבוקס של Cowork — לא יכולתי לאשר build/commit/deploy משם, ראו למטה).

**עדכון ל-HANDOFF.md** כבר בוצע (סעיף "אומת בדפדפן בתאריך 2026-06-26") — קראו אותו לפני שמתחילים.

## למה זה לא הושלם מהסנדבוקס
1. `.git/index.lock` היה נעול ולא ניתן למחיקה (כנראה סשן git/VS Code אחר פתוח על הריפו במקביל) — לא הצלחתי לעשות commit.
2. `npm run build` נכשל בשלב ניקוי `dist/` עם שגיאת הרשאות (לא שגיאת קוד — `vite build` עצמו עבר טרנספורמציה תקינה של 157 מודולים).
3. אין Firebase CLI מותקן/מאומת בסנדבוקס.

## משימה 1 — אימות + קומיט
1. ודאו שאין סשן git/VS Code אחר פתוח על הריפו (כדי שלא תיתקלו ב-`index.lock`).
2. `cd app && npm test && npm run build` — ודאו שהכל עובר נקי (כולל ניקוי `dist/` תקין).
3. קומיט עם הודעה:
   ```
   fix(tts): defer speak() to next tick after cancel() to stop Chrome speech-engine hang
   ```
   (גוף ההודעה כבר כתוב ב-`app/src/services/tts/ttsService.ts` git diff — אפשר להעתיק מההיסטוריה שתראו ב-`git diff` לפני commit, או לכתוב תקציר דומה לזה שב-HANDOFF.md).
4. `git push`.

## משימה 2 — Deploy ובדיקה חוזרת
1. פרסו ל-Firebase Hosting (כמו בדיפלוי הקודם ל-`co-board--phase-i-bugfix-iuejvxox.web.app` או ל-URL החדש שתבחרו).
2. בדפדפן: פתחו את ה-URL, הריצו את היירוט הזה ב-DevTools console *לפני* שלוחצים על "דבר":
   ```js
   window.__c = 0;
   const orig = speechSynthesis.speak.bind(speechSynthesis);
   speechSynthesis.speak = (u) => { window.__c++; return orig(u); };
   ```
   לחצו "דבר" פעם אחת, המתינו 5 שניות, ובדקו `window.__c` ו-`speechSynthesis.speaking`. **קריטריון הצלחה**: `__c` נשאר קטן (1–2, לא ממשיך לטפס), ו-`speaking` חוזר ל-`false` תוך כמה שניות (לא נשאר `true` לנצח).
3. עדכנו את `HANDOFF.md` בתוצאה (PASS/FAIL) מתחת לסעיף שכבר קיים.

## משימה 3 — חקירת "קול נוסף (אישה) בעברית"
המשתמש (נעם) שאל: "אומר לא טוב וגם אני לא טוב יש אפשרות לקול אחר נגיד של אישה בעברית שיהיה בנוסף?" — כלומר התלונה היא גם על **איכות/הגייה** של הקול הנוכחי, וגם בקשה ל**קול נשי נוסף** בנוסף לקיים.

הקשר טכני שכבר קיים בקוד (אל תבנו מחדש בלי לבדוק את זה קודם):
- `AccessSettingsPanel.tsx` (שורות ~210–220) **כבר מציג** dropdown לבחירת קול (`voice-select`) שמציג את כל הקולות העבריים שה-OS/דפדפן חושפים דרך `speechSynthesis.getVoices()`. אם יש רק קול עברי אחד מותקן ב-Windows/Chrome של המשתמש, ה-dropdown יראה רק אופציה אחת — זו לא בהכרח באג בקוד, אלא מגבלת מערכת ההפעלה.
- `HybridTtsService` + `TTSProvider` (ב-`app/src/services/tts/hybridTtsService.ts`, `ttsProvider.ts`) — יש כבר תשתית להחליף/להוסיף ספק TTS חיצוני (לפי `docs/adr-0003-tts.md`, המתועד ב-HANDOFF כ-Google Neural2 לעת עתה, Almagu כיעד עתידי). זה הנתיב הנכון להוסיף קול אישה איכותי בעברית בלי תלות בקולות שמותקנים מקומית ב-Windows.

**מה לבדוק/לעשות:**
1. בדקו כמה קולות עבריים זמינים בפועל בדפדפן/Windows של המשתמש (`speechSynthesis.getVoices().filter(v=>v.lang.startsWith('he'))` בקונסול) — אם יש רק אחד, זה מסביר גם את "אומר לא טוב" (קול ברירת מחדל באיכות נמוכה) וגם את "אין קול אישה" (לא מותקן).
2. אם המסקנה היא שצריך ספק TTS חיצוני: בדקו את `docs/adr-0003-tts.md` ו-`hybridTtsService.ts`/`ttsProvider.ts` לראות כמה מהאינטגרציה כבר בנויה מול Google Cloud TTS (יש קולות נשיים/גבריים עבריים איכותיים שם, למשל `he-IL-Wavenet-A`/`he-IL-Wavenet-C`), והשלימו את החיבור אם חסר (API key, endpoint, מיפוי voicePref→voiceURI).
3. אם המסקנה היא שזה רק חוסר התקנה מקומית: כתבו למשתמש הנחיה קצרה איך להוסיף קול עברי נוסף ב-Windows (Settings → Time & Language → Speech → Manage voices), ו-Chrome ישלוף אותו אוטומטית ל-dropdown הקיים.
4. בכל מקרה — אל תניחו תשובה לפני שבדקתם בפועל מה רואה הדפדפן/Windows של המשתמש; שתפו את הממצא בקצרה.

## פלט מצופה
1. `index.lock` לא חוסם, commit+push בוצעו, build/deploy עברו.
2. תוצאת re-test של באג 3 מתועדת ב-HANDOFF.md.
3. תשובה מבוססת-בדיקה (לא הנחה) לשאלת הקול הנשי, עם המלצה קונקרטית (התקנת קול OS / חיבור ספק TTS חיצוני).
