/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import autoConfig from "../../firebase-applet-config.json";

const customConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Use custom project if API key is provided in Secrets, otherwise fallback to AI Studio's auto-provisioned Firebase
const finalConfig = customConfig.apiKey ? customConfig : autoConfig;

export const app = initializeApp(finalConfig);
export const auth = getAuth(app);

// Use specific database ID if provided in config
const dbId = (finalConfig as any).firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export async function ensureAnonSession(): Promise<void> {
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
