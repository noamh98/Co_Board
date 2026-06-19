import { getDb, STORE_PROFILES } from './db';
import type { Profile } from '../domain/models';

// מאגר פרופילי ילד מעל IndexedDB. ריבוי פרופילים על מכשיר אחד (PRD §4.5/FR-001).
// נתוני ילד רגישים — מקומיים ופרטיים (אינווריאנט פרטיות, HANDOFF §4 / PRD §8.4).
// מחיקה = ארכוב (archived=true), לא הסרה (PRD §4.5: ארכוב + גיבוי).

export interface ProfileRepo {
  get(id: string): Promise<Profile | undefined>;
  list(opts?: { includeArchived?: boolean }): Promise<Profile[]>;
  save(profile: Profile): Promise<void>;
  archive(id: string): Promise<void>;
}

export function createProfileRepo(): ProfileRepo {
  return {
    async get(id) {
      const db = await getDb();
      return (await db.get(STORE_PROFILES, id)) as Profile | undefined;
    },
    async list(opts = {}) {
      const db = await getDb();
      const all = (await db.getAll(STORE_PROFILES)) as Profile[];
      return opts.includeArchived ? all : all.filter((p) => !p.archived);
    },
    async save(profile) {
      const db = await getDb();
      await db.put(STORE_PROFILES, profile);
    },
    async archive(id) {
      const db = await getDb();
      const existing = (await db.get(STORE_PROFILES, id)) as Profile | undefined;
      if (!existing) return;
      await db.put(STORE_PROFILES, { ...existing, archived: true });
    },
  };
}
