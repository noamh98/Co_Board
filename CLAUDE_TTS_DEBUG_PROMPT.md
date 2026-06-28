# TTS Debug & Fix Task

## Context

React + Vite + Firebase PWA: `c:\PROJECTS\Co_Board\app\`  
Deployed at: https://co-board.web.app

## Problem

Google TTS integration broken. User reports voices appear in dropdown but produce no sound (or fallback to browser voice "Microsoft Asaf").

## Architecture

- `app/src/services/tts/googleTtsProvider.ts` — calls `https://texttospeech.googleapis.com/v1/text:synthesize` with `x-goog-api-key` header
- `app/src/services/tts/hybridTtsService.ts` — tries Google TTS first, silently catches errors and falls back to Web Speech API
- `app/src/App.tsx` (line ~232–240) — reads `VITE_GOOGLE_TTS_KEY` from `import.meta.env`, falls back to user-stored key from IndexedDB
- `app/.env.local` — contains `VITE_GOOGLE_TTS_KEY=AIzaSyD_95fPqwImRxa2OMbTJzcNadcHp6zsMdU` (local only, not committed)
- `app/src/presentation/settings/AccessSettingsPanel.tsx` — hides API key input when env key present

## What to investigate

1. **Is the env key reaching the bundle?**
   - Grep `app/dist/assets/*.js` for `VITE_GOOGLE_TTS_KEY` or the key value `AIzaSyD_`
   - If missing: the build ran before the key was added, or Vite didn't pick up `.env.local`

2. **Is Google TTS actually being called?**  
   - Add temporary `console.error` in the catch block in `hybridTtsService.ts` line 41:
     ```ts
     } catch (err) {
       console.error('[TTS] Google TTS failed:', err);
       // fall through to Web Speech
     }
     ```
   - Rebuild locally (`npm run build` from `app/`) and check DevTools Console

3. **Is `ttsApiKey` state set in App?**
   - Add `console.log('[TTS] apiKey loaded:', apiKey ? 'YES' : 'NO')` after line 235 in `App.tsx`

4. **Likely root causes (in order of probability):**
   a. Env key not in bundle → Vite `import.meta.env.VITE_GOOGLE_TTS_KEY` is `undefined` → falls back to IndexedDB (also empty) → no provider → Web Speech
   b. GCP: Cloud Text-to-Speech API not enabled for the `co-board` project
   c. GCP: API key HTTP referrer restriction blocking local dev or prod domain
   d. GCP: API key restriction set to wrong API (not Cloud Text-to-Speech API)

## Fix steps

1. Verify bundle contains the key: `grep -r "AIzaSyD_" app/dist/assets/`
2. If missing: `cd app && npm run build` then `firebase deploy --only hosting` from project root
3. If present but TTS fails: expose the error in hybridTtsService catch block and report the actual HTTP status from Google
4. If 403 from Google: enable Cloud Text-to-Speech API at console.cloud.google.com → project `co-board` → API Library → Cloud Text-to-Speech API → Enable
5. After fix: run `npm run build && firebase deploy --only hosting` from `c:\PROJECTS\Co_Board`

## Expected result

- Settings → קול ודיבור: shows 4 Google voices (Neural2/Wavenet), no API key input field
- Pressing a cell: audio plays via Google TTS (not Web Speech / Microsoft Asaf)
- DevTools Network: POST to `texttospeech.googleapis.com` returns 200

## Do NOT

- Commit `.env.local` (it contains a secret API key)
- Change the key value
- Remove the COMMERCIAL TODO comments
