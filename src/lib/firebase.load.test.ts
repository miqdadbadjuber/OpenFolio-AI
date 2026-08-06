import { describe, it, expect } from "vitest";

// Regression test for a synchronous module-import crash: when the VITE_FIREBASE_* env vars
// are not set, `src/lib/firebase.ts` must NOT throw. `getFirestore(app)` throws
// synchronously when the app has no own `projectId`, so the module must leave `db` null in
// that case (never construct Firestore). The module reads `import.meta.env.VITE_FIREBASE_*`
// only, so in a clean run (no env set) `hasFirebaseConfig` is false and `db` is null.
describe("firebase module load safety", () => {
  it("imports without throwing; db is a Firestore instance or null", async () => {
    const mod = await import("./firebase");
    expect(mod).toBeDefined();
    expect(typeof mod.hasFirebaseConfig).toBe("boolean");
    // Invariant: Firestore is only constructed when BOTH an apiKey AND a projectId are
    // present (hasFirebaseConfig). In the absent case (no VITE_FIREBASE_* set) db must be
    // null and the module must NOT have thrown (getFirestore would have thrown
    // synchronously).
    if (mod.hasFirebaseConfig) {
      expect(mod.db).not.toBeNull();
    } else {
      expect(mod.db).toBeNull();
    }
  });
});
