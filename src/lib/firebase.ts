/// <reference types="vite/client" />
import { initializeApp, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Firebase web config is read only from the VITE_FIREBASE_* environment variables
// (see `.env.example`). Vite embeds VITE_-prefixed vars into the client bundle at build
// time, so there is no committed config file and nothing to leak.
const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Whether a usable Firebase config is present. When false, the app entry renders a
// "not configured" notice instead of the app, and NONE of the Firebase instances are
// constructed: both `getAuth` and `getFirestore` throw synchronously when the app has no
// own `apiKey` / `projectId` (verified in @firebase/app, @firebase/auth, @firebase/firestore).
// Require BOTH — a config with a projectId but no apiKey would make `getAuth(app)` throw
// `auth/invalid-api-key` at import.
export const hasFirebaseConfig = Boolean(config.apiKey && config.projectId);

if (!hasFirebaseConfig) {
  // Degrade sensibly: warn instead of throwing at module import. The app entry shows a
  // "not configured" notice until VITE_FIREBASE_* is provided (see `.env.example`).
  console.warn(
    "[firebase] Firebase belum dikonfigurasi. Salin `.env.example` ke `.env` dan isi " +
      "variabel VITE_FIREBASE_*. Authentication dan Firestore nonaktif sampai terisi."
  );
}

export const app: FirebaseApp | null = hasFirebaseConfig ? initializeApp(config) : null;
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;

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
