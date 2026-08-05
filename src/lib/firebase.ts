/// <reference types="vite/client" />
import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

if (!finalConfig) {
  // Degrade sensibly: warn and initialize with an empty config so module import never
  // throws. Auth/Firestore calls will fail with clear runtime errors until a config is
  // provided (firebase-applet-config.json or VITE_FIREBASE_*).
  console.warn(
    "[firebase] No Firebase config found. Copy `firebase-applet-config.example.json` to " +
      "`firebase-applet-config.json` or set the VITE_FIREBASE_* variables in `.env.local`. " +
      "Authentication and Firestore features are disabled until configured."
  );
}

export const app = initializeApp(finalConfig ?? {});
export const auth = getAuth(app);

// Use specific database ID if provided in config
const dbId = finalConfig?.firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

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
