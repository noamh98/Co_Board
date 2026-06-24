// services/sync/storageProvider.ts — ממשק אחסון קבצים (תמונות מוצפנות).
// Backend-agnostic: LocalStubStorageProvider לבדיקות, FirebaseStorageProvider בייצור.
// ARCHITECTURE.md: Cloud מאחורי interface — בדיוק כמו SyncProvider.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getBlob,
  type FirebaseStorage,
} from 'firebase/storage';

export interface StorageProvider {
  /** מעלה blob מוצפן ל-path ומחזיר downloadURL. */
  upload(path: string, encryptedBlob: Blob): Promise<string>;
  /** מוריד blob מוצפן מ-path. */
  download(path: string): Promise<Blob>;
  /** מוחק קובץ מה-storage. */
  delete(path: string): Promise<void>;
  /** האם ה-provider זמין (רשת / אתחול). */
  isAvailable(): boolean;
}

/** Provider לבדיקות — שומר ב-Map בזיכרון, ללא רשת. */
export class LocalStubStorageProvider implements StorageProvider {
  private readonly _store = new Map<string, Blob>();

  async upload(path: string, encryptedBlob: Blob): Promise<string> {
    this._store.set(path, encryptedBlob);
    return `stub://${path}`;
  }

  async download(path: string): Promise<Blob> {
    const blob = this._store.get(path);
    if (!blob) throw new Error(`LocalStubStorageProvider: not found: ${path}`);
    return blob;
  }

  async delete(path: string): Promise<void> {
    if (!this._store.has(path)) throw new Error(`LocalStubStorageProvider: not found: ${path}`);
    this._store.delete(path);
  }

  isAvailable(): boolean {
    return true;
  }

  /** חשיפה לבדיקות: רשימת paths שאוחסנו. */
  storedPaths(): string[] {
    return Array.from(this._store.keys());
  }
}

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

/** Provider Firebase Storage — path: `profiles/{profileId}/media/{mediaId}`. */
export class FirebaseStorageProvider implements StorageProvider {
  private _storage: FirebaseStorage | null = null;

  private getStorage(): FirebaseStorage {
    if (!this._storage) {
      const existing = getApps();
      const app: FirebaseApp = existing.length
        ? existing[0]
        : initializeApp(FIREBASE_CONFIG);
      this._storage = getStorage(app);
    }
    return this._storage;
  }

  async upload(path: string, encryptedBlob: Blob): Promise<string> {
    const storage = this.getStorage();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, encryptedBlob, {
      contentType: 'application/octet-stream',
    });
    return getDownloadURL(storageRef);
  }

  async download(path: string): Promise<Blob> {
    const storage = this.getStorage();
    const storageRef = ref(storage, path);
    return getBlob(storageRef);
  }

  async delete(path: string): Promise<void> {
    const storage = this.getStorage();
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  }

  isAvailable(): boolean {
    return !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  }
}
