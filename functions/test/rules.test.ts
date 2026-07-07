// functions/test/rules.test.ts — בדיקות יחידה לחוקי Firestore (B4).
// דורש: Firestore emulator פעיל + התקנת @firebase/rules-unit-testing + vitest.
// הרצה: npm run test:rules  (מפעיל את האמולטור דרך firebase emulators:exec).
//
// כיסוי:
//   1) משתמש שאינו הבעלים אינו יכול לקרוא shareInvites של אחר.
//   2) משתמש שאינו חבר אינו יכול לקרוא children של בעלים אחר.
//   3) חבר רגיל (clinician) אינו יכול לכתוב ל-childAccess (privilege escalation).
//   4) משתמש לא-מאושר (ללא approved claim) אינו יכול לקרוא children — גם הבעלים.
//   5) D-01: חבר childAccess מאושר *כן* קורא את מסמך הילד המשותף (positive).
//   6) D-01: חבר childAccess קורא לוח משותף (top-level childId) אך אינו כותב.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'co-board-rules-test';
const OWNER = 'owner-uid';
const CLINICIAN = 'clinician-uid';
const STRANGER = 'stranger-uid';
const CHILD = 'child-1';
const CODE = 'ABCDEF0123456789';
const BOARD = 'board-shared-1';

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
    // רשומת משתמש מאושרת — לבדיקות immutability של status (S-1).
    await setDoc(doc(db, `users/${OWNER}`), {
      status: 'approved',
      displayName: 'בעלים',
    });
    // מסמך לוח מסונכרן עם childId ברמת המסמך (D-01, approach A).
    await setDoc(doc(db, `users/${OWNER}/board/${BOARD}`), {
      entityType: 'board',
      entityId: BOARD,
      childId: CHILD,
      version: 1,
      updatedAt: 1,
      deviceId: 'seed-device',
      data: { id: BOARD, name: 'לוח משותף', childId: CHILD },
    });
    // מסמך settings ללא childId — לוודא שחבר childAccess אינו קורא אותו.
    await setDoc(doc(db, `users/${OWNER}/settings/pref`), {
      entityType: 'settings',
      entityId: 'pref',
      version: 1,
      updatedAt: 1,
      deviceId: 'seed-device',
      data: { key: 'pref', value: 1 },
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

  it('user cannot change own status (immutable from client)', async () => {
    // משתמש מאושר לא יכול להוריד את עצמו ל-pending — status נכתב רק ע"י CF.
    const db = approved(OWNER).firestore();
    await assertFails(updateDoc(doc(db, `users/${OWNER}`), { status: 'pending' }));
  });

  it('user can update own displayName without touching status', async () => {
    const db = approved(OWNER).firestore();
    await assertSucceeds(updateDoc(doc(db, `users/${OWNER}`), { displayName: 'שם חדש' }));
  });
});

describe('Firestore rules — D-01 positive sharing read access', () => {
  it('owner can read own child (sanity)', async () => {
    const db = approved(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, `users/${OWNER}/children/${CHILD}`)));
  });

  it('childAccess member (clinician) can read the shared child', async () => {
    // D-01: מוזמן שקיבל גישה דרך childAccess חייב להצליח לקרוא את מסמך הילד המשותף.
    const db = approved(CLINICIAN).firestore();
    await assertSucceeds(getDoc(doc(db, `users/${OWNER}/children/${CHILD}`)));
  });

  it('childAccess member can read the child members list', async () => {
    const db = approved(CLINICIAN).firestore();
    await assertSucceeds(getDoc(doc(db, `childAccess/${CHILD}/members/${OWNER}`)));
  });

  it('unapproved childAccess member cannot read the shared child', async () => {
    // גם חבר childAccess מחויב ב-isApproved — אישור חסר חוסם קריאה.
    const db = unapproved(CLINICIAN).firestore();
    await assertFails(getDoc(doc(db, `users/${OWNER}/children/${CHILD}`)));
  });
});

describe('Firestore rules — D-01 shared board content (approach A)', () => {
  it('childAccess member (clinician) can read a shared board doc via top-level childId', async () => {
    const db = approved(CLINICIAN).firestore();
    await assertSucceeds(getDoc(doc(db, `users/${OWNER}/board/${BOARD}`)));
  });

  it('stranger cannot read the shared board doc', async () => {
    const db = approved(STRANGER).firestore();
    await assertFails(getDoc(doc(db, `users/${OWNER}/board/${BOARD}`)));
  });

  it('childAccess member cannot write the shared board doc (read-only)', async () => {
    const db = approved(CLINICIAN).firestore();
    await assertFails(
      setDoc(doc(db, `users/${OWNER}/board/${BOARD}`), {
        entityType: 'board',
        entityId: BOARD,
        childId: CHILD,
        version: 2,
        updatedAt: 2,
        deviceId: 'clinician-device',
        data: { id: BOARD, name: 'שינוי לא מורשה', childId: CHILD },
      }),
    );
  });

  it('childAccess member cannot read owner settings doc (no childId)', async () => {
    const db = approved(CLINICIAN).firestore();
    await assertFails(getDoc(doc(db, `users/${OWNER}/settings/pref`)));
  });

  it('owner can still read and write own board doc', async () => {
    const db = approved(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, `users/${OWNER}/board/${BOARD}`)));
  });

  it('unapproved childAccess member cannot read the shared board doc', async () => {
    const db = unapproved(CLINICIAN).firestore();
    await assertFails(getDoc(doc(db, `users/${OWNER}/board/${BOARD}`)));
  });
});
