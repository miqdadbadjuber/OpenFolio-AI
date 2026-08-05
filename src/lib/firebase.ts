/// <reference types="vite/client" />
import { initializeApp, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

type AppConfig = FirebaseOptions & { firestoreDatabaseId?: string };

// Load the AI Studio auto-provisioned Firebase config ONLY if the file exists locally.
// A root-relative import.meta.glob with a literal path matches nothing — instead of
// hard-failing the build — when `firebase-applet-config.json` is absent (CI, fresh clone,
// or a clean public checkout). Copy `firebase-applet-config.example.json` to opt into it.
const configModules = import.meta.glob<{ default: AppConfig }>("/firebase-applet-config.json", { eager: true });
const autoConfig: AppConfig | undefined = configModules["/firebase-applet-config.json"]?.default;

const customConfig: AppConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Use custom project if API key is provided in Secrets, otherwise fallback to AI Studio's auto-provisioned Firebase
const finalConfig: AppConfig | undefined = customConfig.apiKey ? customConfig : autoConfig;

// Whether a usable Firebase config is present. When false, the app entry renders a
// "not configured" notice instead of the app, and NONE of the Firebase instances are
// constructed: both `getAuth` and `getFirestore` throw synchronously when the app has no
// own `apiKey` / `projectId` (verified in @firebase/app, @firebase/auth, @firebase/firestore).
export const hasFirebaseConfig = Boolean(finalConfig?.projectId);

if (!finalConfig) {
  // Degrade sensibly: warn instead of throwing at module import. The app entry shows a
  // "not configured" notice until a config is provided (firebase-applet-config.json or
  // the VITE_FIREBASE_* variables in `.env.local`).
  console.warn(
    "[firebase] No Firebase config found. Copy `firebase-applet-config.example.json` to " +
      "`firebase-applet-config.json` or set the VITE_FIREBASE_* variables in `.env.local`. " +
      "Authentication and Firestore features are disabled until configured."
  );
} else if (!hasFirebaseConfig) {
  console.warn(
    "[firebase] Firebase config found but it is missing a projectId. Check " +
      "`firebase-applet-config.json` / the VITE_FIREBASE_PROJECT_ID variable. Firestore " +
      "features are disabled until a projectId is provided."
  );
}

// Use specific database ID if provided in config
const dbId = finalConfig?.firestoreDatabaseId;

export const app: FirebaseApp | null = hasFirebaseConfig ? initializeApp(finalConfig!) : null;
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? (dbId ? getFirestore(app, dbId) : getFirestore(app)) : null;

export async function ensureAnonSession(): Promise<void> {
  if (!auth) return;
  if (auth.currentUser) return;
  await new Promise<void>((resolve) => {
    const unsub = auth.onAuthStateChanged(() => { unsub(); resolve(); });
  });
  if (auth.currentUser) return;
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.warn("Anonymous auth gagal:", e);
  }
}
