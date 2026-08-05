import admin from "firebase-admin";
import type { Request, Response, NextFunction } from "express";

let initialized = false;
export function initAdmin(): typeof admin {
  if (initialized) return admin;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin belum dikonfigurasi — endpoint ber-auth akan menolak semua request.");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    initialized = true;
  }
  return admin;
}

declare global {
  namespace Express {
    interface Request { user?: { uid: string } }
  }
}

type TokenVerifier = (token: string) => Promise<{ uid: string }>;
const defaultVerifier: TokenVerifier = async (token: string) => {
  const decoded = await admin.auth().verifyIdToken(token);
  return { uid: decoded.uid };
};

export function makeRequireAuth(verify: TokenVerifier = defaultVerifier) {
  return async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const user = await verify(token);
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: "Unauthorized" });
    }
  };
}

export const requireAuth = makeRequireAuth();
