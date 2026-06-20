// services/sync/syncProvider.ts — interface backend-אגנוסטי + LocalStubProvider (offline/בדיקות).
// PRD §4.8, ADR-0002. ספק אמיתי (Firebase) ב-firebaseProvider.ts.

import type { Versioned } from '../../domain/sync';

export interface SyncRecord {
  entityType: string;
  entityId: string;
  versioned: Versioned<unknown>;
}

export interface SyncProvider {
  /** האם ספק הענן זמין (רשת + auth). */
  isAvailable(): boolean;
  /** דחיפת שינויים מקומיים לענן. */
  push(records: SyncRecord[]): Promise<void>;
  /** משיכת שינויים מהענן מאז timestamp. */
  pull(since: number): Promise<SyncRecord[]>;
  /** מזהה המכשיר הנוכחי. */
  getDeviceId(): string;
  /** כניסה עם email/password. מחזיר uid. */
  signIn(email: string, password: string): Promise<string>;
  /** יציאה. */
  signOut(): Promise<void>;
  /** uid של המשתמש המחובר, או null. */
  getCurrentUid(): string | null;
}

/**
 * LocalStubProvider — מימוש offline בזיכרון (לבדיקות ו-MVP ללא ספק).
 * push שומר בזיכרון; pull מחזיר מה ש-push שמר מאז `since`.
 */
export class LocalStubProvider implements SyncProvider {
  private store: SyncRecord[] = [];
  private deviceId: string;

  constructor(deviceId = 'stub-device') {
    this.deviceId = deviceId;
  }

  isAvailable(): boolean {
    return true;
  }

  async push(records: SyncRecord[]): Promise<void> {
    for (const r of records) {
      const idx = this.store.findIndex(
        (s) => s.entityType === r.entityType && s.entityId === r.entityId,
      );
      if (idx >= 0) {
        this.store[idx] = r;
      } else {
        this.store.push(r);
      }
    }
  }

  async pull(since: number): Promise<SyncRecord[]> {
    return this.store.filter((r) => r.versioned.updatedAt > since);
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  async signIn(_email: string, _password: string): Promise<string> {
    return 'stub-uid';
  }

  async signOut(): Promise<void> {}

  getCurrentUid(): string | null {
    return 'stub-uid';
  }
}
