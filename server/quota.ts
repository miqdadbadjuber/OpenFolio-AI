import { getFirestore } from "firebase-admin/firestore";

export const QUOTA_LIMITS = { generate: 5, edit: 7 } as const;
export type QuotaType = keyof typeof QUOTA_LIMITS;

export interface UsageDoc {
  generates: number;
  edits: number;
  lastResetDate: string;
}

// Reconciles singular QuotaType keys with plural UsageDoc field names
// (defect fix: QUOTA_LIMITS keys are singular, UsageDoc fields are plural).
type UsageField = Exclude<keyof UsageDoc, "lastResetDate">;
const FIELD_MAP: Record<QuotaType, UsageField> = { generate: "generates", edit: "edits" };

const today = () => new Date().toISOString().split("T")[0] ?? "";
const defaultDoc = (): UsageDoc => ({ generates: 0, edits: 0, lastResetDate: today() });

export function resetIfNeeded(doc: UsageDoc): UsageDoc {
  if (doc.lastResetDate !== today()) return defaultDoc();
  return doc;
}

// Murni & bisa dites: cek + hitung langkah berikutnya.
export function evaluateUsage(doc: UsageDoc, type: QuotaType): { allowed: boolean; next: UsageDoc } {
  const current = resetIfNeeded(doc);
  const field = FIELD_MAP[type];
  const allowed = current[field] < QUOTA_LIMITS[type];
  return { allowed, next: allowed ? { ...current, [field]: current[field] + 1 } : current };
}

export async function getUsage(uid: string): Promise<UsageDoc> {
  const ref = getFirestore().doc(`usage/${uid}`);
  const snap = await ref.get();
  return snap.exists ? resetIfNeeded(snap.data() as UsageDoc) : defaultDoc();
}

export async function canSpend(uid: string, type: QuotaType): Promise<boolean> {
  return evaluateUsage(await getUsage(uid), type).allowed;
}

export async function reserveQuota(uid: string, type: QuotaType): Promise<boolean> {
  const ref = getFirestore().doc(`usage/${uid}`);
  return await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data() as UsageDoc) : defaultDoc();
    const { allowed, next } = evaluateUsage(current, type);
    if (!allowed) return false;
    tx.set(ref, next);
    return true;
  });
}

export async function refundQuota(uid: string, type: QuotaType): Promise<void> {
  const ref = getFirestore().doc(`usage/${uid}`);
  await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const current = resetIfNeeded(snap.data() as UsageDoc);
    const field = FIELD_MAP[type];
    if (current[field] > 0) {
      tx.set(ref, { ...current, [field]: current[field] - 1 });
    }
  });
}

export async function markSpent(uid: string, type: QuotaType): Promise<void> {
  const ref = getFirestore().doc(`usage/${uid}`);
  await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const { next } = evaluateUsage(snap.exists ? (snap.data() as UsageDoc) : defaultDoc(), type);
    tx.set(ref, next);
  });
}
