// data/firebaseEnv.ts — קונפיג Firebase מאומת (G2).
// במקום `as string` שקט (שמייצר ערכי undefined בזמן ריצה), כאן נזרקת שגיאה ברורה
// בעת ה-init הראשון אם חסר משתנה סביבה — misconfig נתפס מוקדם ולא כ-"auth נכשל" סתום.

export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

/** מחזיר קונפיג Firebase מאומת. זורק שגיאה ברורה אם חסר משתנה סביבה כלשהו. */
export function getFirebaseConfig(): FirebaseEnvConfig {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(
      `קונפיגורציית Firebase חסרה (G2): ${missing.join(', ')} — ודא שהמשתנים מוגדרים ב-.env`,
    );
  }
  return {
    apiKey: env.VITE_FIREBASE_API_KEY!,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: env.VITE_FIREBASE_PROJECT_ID!,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    appId: env.VITE_FIREBASE_APP_ID!,
  };
}
