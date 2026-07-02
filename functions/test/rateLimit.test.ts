// functions/test/rateLimit.test.ts — בדיקות יחידה ל-enforceRateLimit (3.2).
// דורש: Firestore emulator פעיל (npm run test:rules — מפעיל דרך firebase emulators:exec).
// enforceRateLimit משתמש ב-Admin SDK (transaction אמיתית) — לא נבדק דרך rules-unit-testing
// (זה מיועד ל-client SDK מול חוקים), אלא מול Firestore אמיתי-מדומה דרך FIRESTORE_EMULATOR_HOST.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { enforceRateLimit } from '../src/rateLimit';

const PROJECT_ID = 'co-board-ratelimit-test';

let app: App;
let db: Firestore;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'rateLimit.test.ts דורש את אמולטור ה-Firestore — הריצו דרך npm run test:rules',
    );
  }
  app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID });
  db = getFirestore(app);
});

afterEach(async () => {
  const snap = await db.collection('rateLimits').get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
});

describe('enforceRateLimit (rateLimit.ts, fixed-window פר-uid)', () => {
  it('מאפשר קריאות עד המכסה', async () => {
    await enforceRateLimit('u1', 'act', { windowMs: 60_000, max: 3 }, db);
    await enforceRateLimit('u1', 'act', { windowMs: 60_000, max: 3 }, db);
    await expect(
      enforceRateLimit('u1', 'act', { windowMs: 60_000, max: 3 }, db),
    ).resolves.toBeUndefined();
  });

  it('חוסם וזורק resource-exhausted אחרי חריגה מהמכסה', async () => {
    await enforceRateLimit('u2', 'act', { windowMs: 60_000, max: 2 }, db);
    await enforceRateLimit('u2', 'act', { windowMs: 60_000, max: 2 }, db);
    await expect(
      enforceRateLimit('u2', 'act', { windowMs: 60_000, max: 2 }, db),
    ).rejects.toThrow('חרגת ממכסת השימוש');
  });

  it('חלון חדש מאפס את המונה אחרי windowMs', async () => {
    await enforceRateLimit('u3', 'act', { windowMs: 50, max: 1 }, db);
    await new Promise((r) => setTimeout(r, 80));
    await expect(
      enforceRateLimit('u3', 'act', { windowMs: 50, max: 1 }, db),
    ).resolves.toBeUndefined();
  });

  it('משתמשים שונים לא חולקים מכסה', async () => {
    await enforceRateLimit('u4a', 'act', { windowMs: 60_000, max: 1 }, db);
    await expect(
      enforceRateLimit('u4b', 'act', { windowMs: 60_000, max: 1 }, db),
    ).resolves.toBeUndefined();
  });

  it('פעולות (actions) שונות לאותו משתמש לא חולקות מכסה', async () => {
    await enforceRateLimit('u5', 'tts', { windowMs: 60_000, max: 1 }, db);
    await expect(
      enforceRateLimit('u5', 'ai', { windowMs: 60_000, max: 1 }, db),
    ).resolves.toBeUndefined();
  });
});
