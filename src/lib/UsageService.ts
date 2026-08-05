import { db, auth } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export const QuotaLimits = { generate: 5, edit: 7 } as const;
export type QuotaType = keyof typeof QuotaLimits;

export interface QuotaSnapshot {
  generates: number;
  edits: number;
  lastResetDate: string;
}

const today = () => new Date().toISOString().split('T')[0] ?? '';
const empty = (): QuotaSnapshot => ({ generates: 0, edits: 0, lastResetDate: today() });

export async function getQuota(): Promise<QuotaSnapshot> {
  const user = auth?.currentUser ?? null;
  if (!user || !db) return empty();
  try {
    const snap = await getDoc(doc(db, 'usage', user.uid));
    if (!snap.exists()) return empty();
    const data = snap.data() as QuotaSnapshot;
    if (data.lastResetDate !== today()) return empty();
    return data;
  } catch (e) {
    console.warn('Gagal membaca kuota:', e);
    return empty();
  }
}

// QuotaSnapshot fields are plural (generates/edits) while QuotaLimits keys are
// singular (generate/edit), so map between the two. Only the numeric count fields
// are valid targets (excludes the string lastResetDate).
type QuotaNumericField = 'generates' | 'edits';
const FIELD_MAP: Record<QuotaType, QuotaNumericField> = { generate: 'generates', edit: 'edits' };

export function remaining(quota: QuotaSnapshot, type: QuotaType): number {
  // `|| 0` guards against a missing/undefined count field (legacy doc) so the UI
  // shows "0/5" instead of "NaN/5".
  return Math.max(0, QuotaLimits[type] - (quota[FIELD_MAP[type]] || 0));
}
