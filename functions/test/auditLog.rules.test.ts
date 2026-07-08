// functions/test/auditLog.rules.test.ts — בדיקות חוקי Firestore ל-auditLog/{entryId} (3.4 / D-08).
// דורש: Firestore emulator + @firebase/rules-unit-testing + vitest.
// הרצה: npm run test:rules (רשום ב-functions/package.json).
//
// ⚠️ projectId ייחודי: vitest מריץ קבצי-בדיקה במקביל; שיתוף projectId היה גורם
//    ל-clearFirestore של קובץ אחד למחוק זרעים של השני. בידוד פרויקט.
//
// כיסוי:
//   חיובי — בעל הרשומה (ownerUid==uid) קורא את הרשומה שלו; Admin קורא כל רשומה,
//           כולל רשומת אדמין ללא ownerUid (user.approve/reject).
//   שלילי — זר אינו קורא; חבר לא-בעלים אינו קורא; משתמש לא-מאושר נחסם;
//           רשומת admin-only (ללא ownerUid) אינה נקראת ע"י לא-אדמין;
//           כל כתיבת-לקוח (create/update/delete) נחסמת — היומן חסין-שיבוש.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const PROJECT_ID = 'co-board-audit-test';
const OWNER = 'audit-owner-uid';
const OTHER = 'audit-other-uid';
const ADMIN = 'audit-admin-uid';
const ENTRY_OWNED = 'entry-access-grant';
const ENTRY_ADMIN_ONLY = 'entry-user-approve';

let testEnv: RulesTestEnvironment;

function approved(uid: string) {
  return testEnv.authenticatedContext(uid, {
    email_verified: true,
    approved: true,
  });
}

function unapproved(uid: string) {
  return testEnv.authenticatedContext(uid, { email_verified: true });
}

function admin(uid: string) {
  return testEnv.authenticatedContext(uid, {
    email_verified: true,
    approved: true,
    admin: true,
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(
        resolve(__dirname, '../../firebase/firestore.rules'),
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
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // רשומת גישה (access.grant) עם ownerUid — קריאה לבעלים או Admin.
    await setDoc(doc(db, `auditLog/${ENTRY_OWNED}`), {
      action: 'access.grant',
      actorUid: OTHER,
      targetUid: OTHER,
      childId: 'child-1',
      ownerUid: OWNER,
      role: 'viewer',
      createdAt: 1,
    });
    // רשומת אדמין (user.approve) ללא ownerUid — קריאה ל-Admin בלבד.
    await setDoc(doc(db, `auditLog/${ENTRY_ADMIN_ONLY}`), {
      action: 'user.approve',
      actorUid: ADMIN,
      targetUid: OTHER,
      createdAt: 1,
    });
  });
});

describe('auditLog — read access', () => {
  it('entry owner can read own (ownerUid) entry', async () => {
    const db = approved(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, `auditLog/${ENTRY_OWNED}`)));
  });

  it('stranger cannot read an owned entry', async () => {
    const db = approved(OTHER).firestore();
    await assertFails(getDoc(doc(db, `auditLog/${ENTRY_OWNED}`)));
  });

  it('unapproved owner cannot read own entry', async () => {
    const db = unapproved(OWNER).firestore();
    await assertFails(getDoc(doc(db, `auditLog/${ENTRY_OWNED}`)));
  });

  it('admin can read any owned entry', async () => {
    const db = admin(ADMIN).firestore();
    await assertSucceeds(getDoc(doc(db, `auditLog/${ENTRY_OWNED}`)));
  });

  it('admin can read an admin-only entry (no ownerUid)', async () => {
    const db = admin(ADMIN).firestore();
    await assertSucceeds(getDoc(doc(db, `auditLog/${ENTRY_ADMIN_ONLY}`)));
  });

  it('non-admin cannot read an admin-only entry (no ownerUid)', async () => {
    const db = approved(OWNER).firestore();
    await assertFails(getDoc(doc(db, `auditLog/${ENTRY_ADMIN_ONLY}`)));
  });
});

describe('auditLog — writes are always denied (tamper-proof)', () => {
  it('owner cannot create an audit entry', async () => {
    const db = approved(OWNER).firestore();
    await assertFails(
      setDoc(doc(db, 'auditLog/forged'), {
        action: 'access.grant',
        actorUid: OWNER,
        ownerUid: OWNER,
      }),
    );
  });

  it('admin cannot create an audit entry from the client', async () => {
    const db = admin(ADMIN).firestore();
    await assertFails(
      setDoc(doc(db, 'auditLog/admin-forged'), {
        action: 'user.approve',
        actorUid: ADMIN,
      }),
    );
  });

  it('owner cannot update own audit entry', async () => {
    const db = approved(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, `auditLog/${ENTRY_OWNED}`), { action: 'access.revoke' }),
    );
  });

  it('owner cannot delete own audit entry', async () => {
    const db = approved(OWNER).firestore();
    await assertFails(deleteDoc(doc(db, `auditLog/${ENTRY_OWNED}`)));
  });

  it('admin cannot delete an audit entry from the client', async () => {
    const db = admin(ADMIN).firestore();
    await assertFails(deleteDoc(doc(db, `auditLog/${ENTRY_ADMIN_ONLY}`)));
  });
});
