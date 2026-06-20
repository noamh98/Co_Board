# M6 — Firebase Auth + Firestore Rules + Login UI

**תאריך:** 2026-06-20  
**FR:** PRD §4.8 (Auth, Sync Security)

## מה נבנה

### א. Firestore Security Rules (`docs/firestore.rules`)
כלל: `users/{uid}/{document=**}` — read/write רק לבעל ה-uid.  
**פריסה:** Firebase Console → Firestore → Rules → הדבק קובץ → Publish.

### ב. Auth Service (`services/sync/authService.ts`)
Facade מינימלי על `SyncProvider`:
- `signIn(provider, email, password)` → `AuthUser`
- `signUp(provider, email, password)` → `AuthUser`
- `signOut(provider)` → מנקה state
- `getCurrentUser()` → `AuthUser | null`
- `onAuthChange(cb)` → unsubscribe fn; קריאה מיידית עם מצב נוכחי

State מודולרי (`_currentUser`, `_listeners`) — לא Redux, לא Context.  
`_resetForTests()` לניקוי בין טסטים.

### ג. SyncProvider interface — signUp הוסף
`signUp(email, password): Promise<string>` נוסף ל-interface + LocalStubProvider + FirebaseProvider.  
FirebaseProvider משתמש ב-`createUserWithEmailAndPassword`.

### ד. Login UI (`presentation/auth/LoginPanel.tsx`)
- שדות email + password + כפתורי "כניסה" / "הרשמה"
- `translateError()` — 6 קודי שגיאה Firebase → עברית
- RTL מלא, `dir="ltr"` על שדות email/password
- מוצג כש-`settingsOpen && syncEnabled && !authUser`

### ה. App.tsx — חיבור Auth
**State חדש:** `authUser: AuthUser | null`  
**syncEnabledRef** — ref מסונכרן עם state כדי שהEngine תמיד יראה ערך נוכחי.

**Provider logic (useEffect על `[syncEnabled, authUser?.uid]`):**
```
provider = (syncEnabled && authUser) ? new FirebaseProvider() : new LocalStubProvider()
```
- FirebaseProvider נוצר **רק** כש-syncEnabled=true && authUser קיים (Privacy invariant).
- logout → authUser=null → re-run useEffect → LocalStubProvider → status=disabled.

**AdultBar:** `onSignOut` prop אופציונלי — מוצג "התנתק" רק כשמחובר.  
**Header:** badge עם שם המשתמש (לפני ה-@) כשמחובר.

## Security Invariants
| בדיקה | מצב |
|-------|-----|
| push/pull בודקים `uid !== null` | ✓ firebaseProvider.ts:59,76 |
| syncEnabled=false → אין FirebaseProvider | ✓ App.tsx useEffect |
| שגיאת auth → Hebrew, לא crash | ✓ LoginPanel translateError |
| !navigator.onLine + auth OK → status='offline' | ✓ syncEngine.ts:44 |
| signOut → authUser=null → LocalStubProvider | ✓ authService + useEffect |

## Tests
- `auth.test.ts` — 6 טסטים (signIn/signOut/onAuthChange/error)
- `LoginPanel.test.tsx` — 5 טסטים (render/submit/error Hebrew/signUp)
- סה"כ: **140 טסטים עוברים** (baseline 129 + 11 חדשים)

## הבא (M7)
Analytics/Logging — **לא מתחיל ללא אישור**.
