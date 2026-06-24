// services/sync/profileSync.ts — סנכרון Profile↔Firestore children/{childId} (2B).
// offline-first: המקור המקומי (profileRepo) תמיד גובר בעת התנגשות.
// syncEnabled=false → אין קריאת רשת.

import type { Profile } from '../../domain/models';
import { getChild, saveChild, type ChildRecord } from '../../data/childRepo';

/** דחיפת פרופיל מקומי → Firestore children/{childId}. */
export async function pushProfile(
  uid: string,
  profile: Profile,
): Promise<void> {
  if (!profile.childId) return;
  const existing = await getChild(uid, profile.childId);
  const child: ChildRecord = {
    childId: profile.childId,
    name: profile.name,
    age: profile.age,
    preferences: profile.preferences,
    homeBoardId: profile.homeBoardId,
    createdAt: existing?.createdAt ?? Date.now(),
    archivedAt: profile.archived ? Date.now() : undefined,
  };
  await saveChild(uid, child);
}

/** משיכת פרופיל מ-Firestore → מיזוג עם פרופיל מקומי (local wins). */
export async function pullProfile(
  uid: string,
  profile: Profile,
): Promise<Profile> {
  if (!profile.childId) return profile;
  try {
    const child = await getChild(uid, profile.childId);
    if (!child) return profile;
    // local wins: שמור שדות מקומיים; מיזוג preferences בלבד מהענן
    return {
      ...profile,
      preferences: {
        ...(child.preferences ?? {}),
        ...(profile.preferences ?? {}),
      },
    };
  } catch {
    return profile;
  }
}
