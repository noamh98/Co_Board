// functions/test/rules.test.ts — בדיקות יחידה לחוקי Firestore (B4).
// דורש: Firestore emulator פעיל + התקנת @firebase/rules-unit-testing + vitest.
// הרצה: npm run test:rules  (מפעיל את האמולטור דרך firebase emulators:exec).
//
// כיסוי:
//   1) משתמש שאינו הבעלים אינו יכול לקרוא shareInvites של אחר.
//   2) משתמש שאינו חבר אינו יכול לקרוא children של בעלים אחר.
//   3) חבר רגיל (clinician) אינו יכול לכתוב ל-childAccess (privilege escalation).
//   4) משתמש לא-מאושר (ללא approved claim) אינו יכול לקרוא children — גם הבעלים.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'co-board-rules-test';
const OWNER = 'owner-uid';
const CLINICIAN = 'clinician-uid';
const STRANGER = 'stranger-uid';
const CHILD = 'child-1';
const CODE = 'ABCDEF0123456789';

let testEnv: RulesTestEnvironment;

/** הקשר משתמש מאושר (email_verified + approved). */
function approved(uid: string) {
  return testEnv.authenticatedContext(uid, {
    email_verified: true,
    approved: true,
  });
}

/** הקשר משתמש לא-מאושר (מחובר אך ללא approved claim). */
function unapproved(uid: string) {
  return testEnv.authenticatedContext(uid, { email_verified: true });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(
        resolve(__dirname, '../../docs/firestore.rules'),
        'utf8',
      ),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // זריעת נתונים תוך עקיפת החוקים.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `shareInvites/${CODE}`), {
      code: CODE,
      childId: CHILD,
      ownerUid: OWNER,
      role: 'clinician',
      createdAt: 1,
      expiresAt: Date.now() + 3_600_000,
      used: false,
    });
    await setDoc(doc(db, `users/${OWNER}/children/${CHILD}`), {
      childId: CHILD,
      name: 'ילד לדוגמה',
      createdAt: 1,
      archivedAt: null,
    });
    await setDoc(doc(db, `childAccess/${CHILD}/members/${OWNER}`), {
      childId: CHILD,
      uid: OWNER,
      role: 'parent',
      grantedAt: 1,
    });
    await setDoc(doc(db, `childAccess/${CHILD}/members/${CLINICIAN}`), {
      childId: CHILD,
      uid: CLINICIAN,
      role: 'clinician',
      grantedAt: 1,
    });
  });
});

describe('Firestore rules — hardening (B4)', () => {
  it('non-owner cannot read shareInvites', async () => {
    const db = approved(STRANGER).firestore();
    await assertFails(getDoc(doc(db, `shareInvites/${CODE}`)));
  });

  it('owner can read own shareInvites (sanity)', async () => {
    const db = approved(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, `shareInvites/${CODE}`)));
  });

  it('non-member cannot read another user children', async () => {
    const db = approved(STRANGER).firestore();
    await assertFails(getDoc(doc(db, `users/${OWNER}/children/${CHILD}`)));
  });

  it('member (clinician) cannot write childAccess — no privilege escalation', async () => {
    const db = approved(CLINICIAN).firestore();
    await assertFails(
      setDoc(doc(db, `childAccess/${CHILD}/members/${STRANGER}`), {
        childId: CHILD,
        uid: STRANGER,
        role: 'clinician',
        grantedAt: Date.now(),
      }),
    );
  });

  it('unapproved user cannot read children', async () => {
    // גם הבעלים — אם אינו מאושר — נחסם (הבעלים אינו פטור מבדיקת האישור).
    const db = unapproved(OWNER).firestore();
    await assertFails(getDoc(doc(db, `users/${OWNER}/children/${CHILD}`)));
  });
});
