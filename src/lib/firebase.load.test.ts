import { describe, it, expect } from "vitest";

// Regression test for a synchronous module-import crash: when `firebase-applet-config.json`
// is absent AND no VITE_FIREBASE_* env vars are set, `src/lib/firebase.ts` must NOT throw.
// `getFirestore(app)` throws synchronously when the app has no own `projectId`, so the module
// must leave `db` null in that case (never construct Firestore). `import.meta.glob` is a Vite
// transform, so this module is loaded through Vite; the glob is real:
//   - locally (config file present)  -> autoConfig loads, db is a Firestore instance
//   - CI / fresh clone (file absent) -> autoConfig is undefined, db is null
// In BOTH cases the import must succeed and `db` must be null-or-object.
describe("firebase module load safety", () => {
  it("imports without throwing; db is a Firestore instance or null", async () => {
    const mod = await import("./firebase");
    expect(mod).toBeDefined();
    expect(typeof mod.hasFirebaseConfig).toBe("boolean");
    // Invariant: Firestore is only constructed when BOTH an apiKey AND a projectId are
    // present (hasFirebaseConfig). In the absent case (no config file AND no
    // VITE_FIREBASE_*) db must be null and the module must NOT have thrown
    // (getFirestore would have thrown synchronously).
    if (mod.hasFirebaseConfig) {
      expect(mod.db).not.toBeNull();
    } else {
      expect(mod.db).toBeNull();
    }
  });
});
