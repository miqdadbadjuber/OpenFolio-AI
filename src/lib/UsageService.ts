import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export interface UsageData {
  tokens: number;
  sessions: number;
  edits: number;
  lastResetDate?: string;
}

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const buildDefaultUsage = (): UsageData => ({
  tokens: 0,
  sessions: 0,
  edits: 0,
  lastResetDate: getTodayDateString()
});

export const USAGE_LIMITS = {
  GUEST: 20000,
  USER: 50000
};

export const UsageService = {
  async getUsage(userId: string | null): Promise<UsageData> {
    const today = getTodayDateString();
    let usage: UsageData;

    if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
      const stored = localStorage.getItem('openfolio_usage_guest');
      usage = stored ? JSON.parse(stored) : buildDefaultUsage();
      if (usage.lastResetDate !== today) {
        usage = buildDefaultUsage();
        localStorage.setItem('openfolio_usage_guest', JSON.stringify(usage));
      }
      return usage;
    }
    try {
      const docRef = doc(db, 'usage', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        usage = docSnap.data() as UsageData;
        if (usage.lastResetDate !== today) {
          usage = buildDefaultUsage();
          await setDoc(docRef, usage);
        }
      } else {
        usage = buildDefaultUsage();
        if (auth.currentUser && auth.currentUser.uid === userId) {
          try {
            await setDoc(docRef, usage);
          } catch (setErr: any) {}
        }
      }
      return usage;
    } catch (e: any) {
      console.error('Error fetching usage:', e);
      return buildDefaultUsage();
    }
  },

  async canGenerate(userId: string | null): Promise<boolean> {
    const usage = await this.getUsage(userId);
    const limit = userId ? USAGE_LIMITS.USER : USAGE_LIMITS.GUEST;
    return usage.tokens < limit;
  },

  async trackUsage(userId: string | null, type: 'chat' | 'generate' | 'edit' | 'template', estimatedTokens?: number) {
    const today = getTodayDateString();
    let tokensToAdd = 0;
    
    if (type === 'chat') tokensToAdd = 350;
    if (type === 'edit') tokensToAdd = 500;
    if (type === 'template') tokensToAdd = 1300;
    if (type === 'generate') {
      tokensToAdd = estimatedTokens || 2300; 
    }

    if (!userId) {
      const stored = localStorage.getItem('openfolio_usage_guest');
      let usage = stored ? JSON.parse(stored) : buildDefaultUsage();
      if (usage.lastResetDate !== today) {
        usage = buildDefaultUsage();
      }
      usage.tokens += tokensToAdd;
      if (type === 'generate') usage.sessions += 1;
      if (type === 'edit') usage.edits += 1;
      if (type === 'template') usage.edits += 1;
      localStorage.setItem('openfolio_usage_guest', JSON.stringify(usage));
      
      // Dispatch an event so components listening can update instantly
      window.dispatchEvent(new Event('usage_updated'));
      return;
    }

    if (auth.currentUser && auth.currentUser.uid === userId) {
      try {
        const docRef = doc(db, 'usage', userId);
        const docSnap = await getDoc(docRef);
        let currentUsage = docSnap.exists() ? (docSnap.data() as UsageData) : buildDefaultUsage();
        
        if (currentUsage.lastResetDate !== today) {
           await setDoc(docRef, buildDefaultUsage());
        }

        const updates: any = {
           tokens: increment(tokensToAdd)
        };
        if (type === 'generate') updates.sessions = increment(1);
        if (type === 'edit') updates.edits = increment(1);
        if (type === 'template') updates.edits = increment(1);

        await updateDoc(docRef, updates).catch(async (err) => {
          if (err.code === 'not-found') {
            await setDoc(docRef, { ...buildDefaultUsage(), ...updates });
          }
        });
        
        window.dispatchEvent(new Event('usage_updated'));
      } catch (e) {
        console.error('Error tracking usage:', e);
      }
    }
  }
};
