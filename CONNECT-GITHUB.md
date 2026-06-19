# חיבור ל-GitHub ודחיפה — פעולה חד-פעמית במחשב שלך

הסביבה המבודדת לא הצליחה לבצע את הדחיפה בעצמה משתי סיבות:
1. **`.git` נעול** — נוצר קובץ נעילה תקוע (`.git/index.lock`) שלא ניתן למחיקה מהסנדבוקס
   (כנראה נעילה מצד Windows / שירות שמחזיק את התיקייה).
2. **הרֵפו פרטי** — דחיפה דורשת את פרטי ההתחברות שלך ל-GitHub, שאינם בסנדבוקס.

שתי הסיבות נפתרות אוטומטית כשמריצים **במחשב שלך**. העתק/י את אחד הבלוקים והרֵץ/י
מתוך תיקיית הפרויקט.

## PowerShell
```powershell
cd "C:\Users\user\Documents\Claude\Projects\לוח תקשורת"
Remove-Item -Force .git\index.lock, .git\config.lock -ErrorAction SilentlyContinue
git rm -r --cached --quiet .npmcache 2>$null
git add -A
git commit -m "M0: PWA scaffold + Motor-Planning invariant + TTS/Nikud spikes + CI + docs"
git remote add origin https://github.com/noamh98/Co_Board.git
git branch -M main
git push -u origin main
```

## Git Bash
```bash
cd "/c/Users/user/Documents/Claude/Projects/לוח תקשורת"
rm -f .git/index.lock .git/config.lock
git rm -r --cached --quiet .npmcache 2>/dev/null
git add -A
git commit -m "M0: PWA scaffold + Motor-Planning invariant + TTS/Nikud spikes + CI + docs"
git remote add origin https://github.com/noamh98/Co_Board.git
git branch -M main
git push -u origin main
```

## הערות
- אם `origin` כבר קיים — החלף `git remote add origin ...` ב-`git remote set-url origin ...`.
- `.npmcache` הוא תיקיית cache של npm שנכתבה ע"י הסנדבוקס; היא ב-`.gitignore`
  והשורה `git rm -r --cached .npmcache` רק מוודאת שלא תיכנס לקומיט.
- אחרי ה-push, ה-CI (GitHub Actions) ירוץ אוטומטית: `npm ci → lint → test → build`.
  זהו שער האימות האמיתי לקוד (שלא ניתן להריץ בסנדבוקס).
