// functions/test/families.test.ts — בדיקות חוקי Firestore ל-families/{familyId} (2.5 / B-02).
// דורש: Firestore emulator + @firebase/rules-unit-testing + vitest.
// הרצה: npm run test:rules (רשום ב-functions/package.json).
//
// כיסוי:
//   חיובי — הבעלים קורא/יוצר/מעדכן(שדה לא-חיובי)/מוחק; חבר memberUids קורא.
//   שלילי — זר אינו קורא; בעלים אינו יכול לשדרג plan/לשנות שדות-חיוב (money-path);
//           יצירה עם plan!=free או שדות-חיוב נדחית; חבר לא-בעלים אינו מעדכן/מוחק;
//           בעלים לא-מאושר נחסם; בידוד בין משפחות (זר אינו נוגע במשפחה אחרת).

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

const PROJECT_ID = 'co-board-rules-test';
const OWNER = 'fam-owner-uid';
const MEMBER = 'fam-member-uid';
const STRANGER = 'fam-stranger-uid';
const FAM = 'family-1';
const FAM_PAID = 'family-paid';

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
    // משפחת free עם בעלים + חבר.
    await setDoc(doc(db, `families/${FAM}`), {
      ownerUid: OWNER,
      memberUids: [OWNER, MEMBER],
      plan: 'free',
      name: 'משפחת לדוגמה',
      createdAt: 1,
    });
    // משפחת paid — לבדיקת immutability של שדות-חיוב מהלקוח.
    // planStatus מזורע כ-past_due כדי שניסיון-לקוח לשנותו ל-active יהיה שינוי אמיתי שנחסם.
    await setDoc(doc(db, `families/${FAM_PAID}`), {
      ownerUid: OWNER,
      memberUids: [OWNER],
      plan: 'paid',
      planStatus: 'past_due',
      billingProvider: 'stripe',
      billingCustomerId: 'cus_test_123',
      billingSubscriptionId: 'sub_test_123',
      currentPeriodEnd: Date.now() + 30 * 86_400_000,
      name: 'משפחה בתשלום',
      createdAt: 1,
    });
  });
});

describe('families — read access', () => {
  it('owner can read own family', async () => {
    const db = approved(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, `families/${FAM}`)));
  });

  it('member (in memberUids) can read the family', async () => {
    const db = approved(MEMBER).firestore();
    await assertSucceeds(getDoc(doc(db, `families/${FAM}`)));
  });

  it('stranger (non-member) cannot read the family', async () => {
    const db = approved(STRANGER).firestore();
    await assertFails(getDoc(doc(db, `families/${FAM}`)));
  });

  it('unapproved owner cannot read the family', async () => {
    const db = unapproved(OWNER).firestore();
    await assertFails(getDoc(doc(db, `families/${FAM}`)));
  });
});

describe('families — create', () => {
  it('owner can create a clean free family', async () => {
    const db = approved(STRANGER).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'families/new-clean'), {
        ownerUid: STRANGER,
        memberUids: [STRANGER],
        plan: 'free',
        name: 'משפחה חדשה',
        createdAt: 1,
      }),
    );
  });

  it('cannot create a family owned by someone else', async () => {
    const db = approved(STRANGER).firestore();
    await assertFails(
      setDoc(doc(db, 'families/forged'), {
        ownerUid: OWNER,
        memberUids: [STRANGER],
        plan: 'free',
      }),
    );
  });

  it('cannot self-provision a paid family on create', async () => {
    const db = approved(STRANGER).firestore();
    await assertFails(
      setDoc(doc(db, 'families/paid-cheat'), {
        ownerUid: STRANGER,
        memberUids: [STRANGER],
        plan: 'paid',
      }),
    );
  });

  it('cannot set billing fields on create', async () => {
    const db = approved(STRANGER).firestore();
    await assertFails(
      setDoc(doc(db, 'families/billing-cheat'), {
        ownerUid: STRANGER,
        memberUids: [STRANGER],
        plan: 'free',
        billingCustomerId: 'cus_forged',
      }),
    );
  });

  it('unapproved user cannot create a family', async () => {
    const db = unapproved(STRANGER).firestore();
    await assertFails(
      setDoc(doc(db, 'families/unapproved'), {
        ownerUid: STRANGER,
        memberUids: [STRANGER],
        plan: 'free',
      }),
    );
  });
});

describe('families — update (billing immutable from client)', () => {
  it('owner can update a non-billing field (name)', async () => {
    const db = approved(OWNER).firestore();
    await assertSucceeds(updateDoc(doc(db, `families/${FAM}`), { name: 'שם חדש' }));
  });

  it('owner can update memberUids', async () => {
    const db = approved(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, `families/${FAM}`), { memberUids: [OWNER, MEMBER, STRANGER] }),
    );
  });

  it('owner cannot self-upgrade plan to paid', async () => {
    const db = approved(OWNER).firestore();
    await assertFails(updateDoc(doc(db, `families/${FAM}`), { plan: 'paid' }));
  });

  it('owner cannot mutate billingCustomerId', async () => {
    const db = approved(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, `families/${FAM_PAID}`), { billingCustomerId: 'cus_hijack' }),
    );
  });

  it('owner cannot flip planStatus to dodge past_due', async () => {
    const db = approved(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, `families/${FAM_PAID}`), { planStatus: 'active' }),
    );
  });

  it('member (non-owner) cannot update the family', async () => {
    const db = approved(MEMBER).firestore();
    await assertFails(updateDoc(doc(db, `families/${FAM}`), { name: 'חבר משנה' }));
  });

  it('owner cannot transfer ownership away', async () => {
    const db = approved(OWNER).firestore();
    await assertFails(updateDoc(doc(db, `families/${FAM}`), { ownerUid: STRANGER }));
  });
});

describe('families — delete + isolation', () => {
  it('owner can delete own family', async () => {
    const db = approved(OWNER).firestore();
    await assertSucceeds(deleteDoc(doc(db, `families/${FAM}`)));
  });

  it('member cannot delete the family', async () => {
    const db = approved(MEMBER).firestore();
    await assertFails(deleteDoc(doc(db, `families/${FAM}`)));
  });

  it('stranger cannot delete another family (cross-family isolation)', async () => {
    const db = approved(STRANGER).firestore();
    await assertFails(deleteDoc(doc(db, `families/${FAM}`)));
  });
});
