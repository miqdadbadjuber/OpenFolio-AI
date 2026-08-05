# OpenFolio Security Hardening & Guest-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden OpenFolio AI (audit 23 temuan), pindah ke Vercel, hapus login jadi guest-only, tambah quota harian server-side, dan siapkan open source (MIT).

**Architecture:** SPA React + Express di-refactor jadi struktur Vercel (`api/index.ts` export app, server tidak serve static). Auth diganti silent Firebase Anonymous Auth; server pakai `firebase-admin` untuk verifikasi token + quota harian per-uid (`usage/{uid}`) + publish snapshot publik (`publicPortfolios/{slug}`). Upload di-hardening (magic byte, 2MB, tanpa Data URI). Portfolio di-sandbox iframe `allow-scripts`.

**Tech Stack:** Express 4, firebase-admin, firebase (client), zod, file-type, multer, cloudinary, express-rate-limit, @google/genai, vitest (test), rimraf, Vercel (serverless Node).

## Global Constraints

- Env var Gemini: `GEMINI_API_KEY` (dukung fallback `GEMINI_API_KEY_NEW`), throw bila kosong.
- Port dev: `Number(process.env.PORT || 3001)`; Vercel tidak pakai `listen`.
- Quota harian per-uid: generate **5**, edit **7**, chat **15** (UTC), disimpan di `usage/{uid}`.
- Upload limit: **2MB** image & PDF; SVG dilarang; magic-byte wajib; tanpa fallback Data URI.
- Iframe sandbox: `sandbox="allow-scripts"` (tanpa `allow-same-origin`) di semua preview portfolio.
- CORS: hanya origin dari `CORS_ORIGIN` (fallback `http://localhost:3001`).
- Firestore: `users` dihapus; `publicPortfolios` read-publik/write-server; `portfolios` owner-only; `usage` read-owner/write-server.
- TypeScript strict aktif di tahap akhir; tidak ada placeholder/TODO di kode.
- Secret tidak boleh ter-commit: `.env*` (kecuali `.env.example`), `firebase-applet-config.json` (asli), service account key.

---

## Phase A — Fondasi & Test Infra

### Task 1: Setup vitest + ekstrak modul portfolio murni

**Files:**
- Create: `vitest.config.ts`
- Create: `server/portfolio-render.ts`
- Modify: `package.json:12` (scripts), `package.json` (devDeps)
- Test: `server/portfolio-render.test.ts`

**Interfaces:**
- Consumes: tidak ada.
- Produces: `escapeHTML(str): string`, `safeParseJSON(text, fallback): any`, `slugify(input): string`, `sanitizePortfolioData(raw): object`, `buildPortfolioHTMLString(data): string`.

- [ ] **Step 1: Install vitest & rimraf sebagai devDependencies**

Run: `npm install -D vitest rimraf`
Expected: terinstall.

- [ ] **Step 2: Tambah script `test` dan ubah `clean` di package.json**

Edit `package.json` scripts:
```json
"clean": "rimraf dist build",
"test": "vitest run"
```

- [ ] **Step 3: Buat `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Buat `server/portfolio-render.ts` dengan fungsi murni**

Pindahkan VERBATIM dari `server.ts` fungsi berikut (potong dari file lama, tempel di sini):
- `escapeHTML` (baris 23-31)
- `safeParseJSON` (baris 46-103)
- `sanitizePortfolioData` (baris 849-947)

Tambah `slugify` baru dan export semuanya:
```ts
export function slugify(input: string): string {
  const base = (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "portfolio";
}
```
Jangan pindahkan `buildPortfolioHTMLString` dulu (Task 3 memindahkannya bersama server restructure). `sanitizePortfolioData` di sini harus sudah diubah sesuai temuan #9: ganti `sanitizeUrl` agar `data:` TIDAK diizinkan, dan URL validasi per konteks:
```ts
const sanitizeUrl = (url: string) => {
  if (!url || url === "#") return "#";
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return url.trim();
  } catch {}
  return "#";
};
const sanitizeEmailUrl = (email: string) => {
  if (!email) return "#";
  const clean = String(email).trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return "mailto:" + clean;
  return "#";
};
```
Terapkan: `socials[k]` dan `projects[].link` pakai `sanitizeUrl`; `projects[].image_url` pakai `sanitizeUrl`; `contact_email` pakai `escapeHTML` (tetap), dan email yang ingin jadi `mailto:` dibangun via `sanitizeEmailUrl`.

- [ ] **Step 5: Tulis test `server/portfolio-render.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { escapeHTML, safeParseJSON, slugify, sanitizePortfolioData } from "./portfolio-render";

describe("escapeHTML", () => {
  it("meng-escape karakter berbahaya", () => {
    expect(escapeHTML("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("safeParseJSON", () => {
  it("mengekstrak JSON dari teks campur", () => {
    const out = safeParseJSON('Teks { "a": 1, } trailing', {});
    expect(out.a).toBe(1);
  });
  it("return fallback bila gagal", () => {
    expect(safeParseJSON("bukan json", "fb")).toBe("fb");
  });
});

describe("slugify", () => {
  it("mengubah nama jadi slug aman", () => {
    expect(slugify("Nama Saya! Ke-2")).toBe("nama-saya-ke-2");
  });
  it("fallback bila kosong", () => {
    expect(slugify("")).toBe("portfolio");
  });
});

describe("sanitizePortfolioData", () => {
  it("memblokir data: URL pada link proyek", () => {
    const out = sanitizePortfolioData({ projects: [{ title: "p", link: "data:text/html,<script>1</script>" }] });
    expect(out.projects[0].link).toBe("#");
  });
  it("mengizinkan https URL", () => {
    const out = sanitizePortfolioData({ projects: [{ title: "p", link: "https://example.com" }] });
    expect(out.projects[0].link).toBe("https://example.com");
  });
  it("meng-escape nama", () => {
    const out = sanitizePortfolioData({ name: "<b>x</b>" });
    expect(out.name).toBe("&lt;b&gt;x&lt;/b&gt;");
  });
});
```

- [ ] **Step 6: Jalankan test, pastikan pass**

Run: `npx vitest run`
Expected: semua test PASS.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts server/portfolio-render.ts server/portfolio-render.test.ts package.json package-lock.json
git commit -m "test: setup vitest and extract pure portfolio render functions"
```

---

### Task 2: Refactor server.ts jadi server/app.ts + dev entry + vercel.json

**Files:**
- Rename: `server.ts` → `server/app.ts`
- Create: `server/dev.ts`
- Create: `api/index.ts`
- Create: `vercel.json`
- Modify: `package.json:8` (scripts)

**Interfaces:**
- Consumes: Task 1 `server/portfolio-render.ts`.
- Produces: `server/app.ts` exports `app` (Express). `api/index.ts` default-exports `app`. `server/dev.ts` listens on PORT.

- [ ] **Step 1: Rename dan bersihkan file**

Run: `git mv server.ts server/app.ts`
Lalu di `server/app.ts`:
- Hapus `import mustache from "mustache";` (baris 9).
- Hapus `import { createServer as createViteServer } from "vite";` (baris 3) — Vite hanya dipakai di `server/dev.ts`, bukan di app.
- Ganti import murni: `import { escapeHTML, safeParseJSON, sanitizePortfolioData } from "./portfolio-render.js";` (dan hapus definisi lokal `escapeHTML`, `safeParseJSON`, `sanitizePortfolioData` yang sudah dipindah ke Task 1). Catatan: gunakan ekstensi `.js` di import TS bila `allowImportingTsExtensions` tidak dipakai untuk runtime — sesuaikan dengan mode `tsx`/Vercel (tsx menerima tanpa ekstensi; Vercel @vercel/node juga menerima. Jika error, tambah ekstensi `.js`).
- Standarkan API key (temuan #13):
  ```ts
  const API_KEY = process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    console.warn("GEMINI_API_KEY tidak ditemukan — fitur AI nonaktif sampai diisi.");
  }
  const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY, ... }) : null;
  ```
  (Semua pemanggilan `ai.` di-wraper: bila `ai` null, balas 503 "AI belum dikonfigurasi".)
- Ganti `const PORT = 3001;` → `const PORT = Number(process.env.PORT || 3001);`
- Pindahkan `buildPortfolioHTMLString` VERBATIM ke `server/portfolio-render.ts` dan export; import di app.ts.

- [ ] **Step 2: Ubah ekor `server/app.ts` — export app, hapus static serving**

`server/app.ts` adalah **pure API app** — HAPUS seluruh blok Vite/static di akhir `startServer()` (baris 1539-1552) tanpa menggantinya. Tidak ada `express.static` (Vercel yang serve dist/), tidak ada Vite middleware (dev.ts yang handle).
Hapus `app.listen(...)` dari dalam `startServer()`. Ubah `startServer` agar **return `app`**:
```ts
async function startServer() { ...; return app; }
```
Di akhir file tambah:
```ts
export const app = await startServer();
export default app;
```
Top-level await didukung Node 20+/Vercel. Jalankan sebagai entry langsung (dev) lewat `server/dev.ts`, bukan `server/app.ts` langsung.

- [ ] **Step 3: Buat `server/dev.ts` (dev entry)**

```ts
import path from "path";
import { createServer as createViteServer } from "vite";
import { app } from "./app";

const PORT = Number(process.env.PORT || 3001);

async function main() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OpenFolio dev server: http://localhost:${PORT}`);
  });
}
main();
```

- [ ] **Step 4: Buat `api/index.ts`**

```ts
import { app } from "../server/app";
export default app;
```

- [ ] **Step 5: Buat `vercel.json`**

```json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Content-Security-Policy", "value": "frame-ancestors 'none'" }
    ]}
  ]
}
```

- [ ] **Step 6: Update scripts `package.json`**

```json
"dev": "tsx server/dev.ts",
"build": "vite build",
"start": "node api/index.js"
```
Hapus script `start` lama bila bertentangan (vercel pakai handler, bukan start). `build` TIDAK lagi membundle server.

- [ ] **Step 7: Verifikasi build & dev**

Run: `npm run lint` → harus pass (perbaiki error import bila ada).
Run: `npm run build` → output di `dist/` HANYA berisi aset SPA (index.html + assets), TIDAK ada `server.cjs`.
Run: `npm run dev` → server jalan, `/api/health` balas `{ status: "ok" }`.

- [ ] **Step 8: Commit**

```bash
git add -A server/app.ts server/dev.ts api/index.ts vercel.json package.json package-lock.json
git commit -m "feat: restructure server for Vercel (export app, split dev entry)"
```

---

## Phase B — Auth & Quota Server

### Task 3: Env Gemini, firebase-admin init, CORS, dan middleware requireAuth

**Files:**
- Create: `server/auth.ts`
- Modify: `server/app.ts` (init admin, CORS, terapkan auth ke endpoint)
- Test: `server/auth.test.ts`

**Interfaces:**
- Consumes: Task 2 `server/app.ts` (exports `app`).
- Produces: `initAdmin()`, `requireAuth` (Express middleware), `makeRequireAuth(verify)` untuk test.

- [ ] **Step 1: Buat `server/auth.ts`**

```ts
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
```

- [ ] **Step 2: Tulis test `server/auth.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { makeRequireAuth } from "./auth";
import type { Request, Response } from "express";

function makeReq(header?: string): Partial<Request> {
  return { headers: { authorization: header } } as Partial<Request>;
}
function makeRes() {
  const res: any = { statusCode: 0, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res as Response;
}

describe("requireAuth", () => {
  it("menolak tanpa token", async () => {
    const mw = makeRequireAuth(async () => { throw new Error("x"); });
    const req = makeReq(undefined) as Request;
    const res = makeRes();
    await mw(req, res, () => { throw new Error("harusnya tidak dipanggil"); });
    expect(res.statusCode).toBe(401);
  });
  it("menolak token salah format", async () => {
    const mw = makeRequireAuth(async () => { throw new Error("bad"); });
    const req = makeReq("Basic abc") as Request;
    const res = makeRes();
    await mw(req, res, () => { throw new Error("harusnya tidak dipanggil"); });
    expect(res.statusCode).toBe(401);
  });
  it("menerima Bearer valid dan set req.user", async () => {
    const mw = makeRequireAuth(async () => ({ uid: "u1" }));
    const req = makeReq("Bearer tok") as Request;
    const res = makeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect((req as any).user.uid).toBe("u1");
  });
});
```

- [ ] **Step 3: Run test**

Run: `npx vitest run server/auth.test.ts`
Expected: PASS.

- [ ] **Step 4: Integrasikan di `server/app.ts`**

- Tambah import: `import { initAdmin, requireAuth } from "./auth.js";`
- Panggil `initAdmin();` setelah `dotenv.config()`.
- Ganti `app.use(cors());` (baris 128) menjadi:
  ```ts
  const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3001").split(",").map(s => s.trim());
  app.use(cors({ origin: corsOrigins }));
  ```
- Terapkan `requireAuth` ke endpoint mahal (tambahkan argumen setelah path):
  - `app.post("/api/pdf/parse", requireAuth, upload.single("file"), ...)`
  - `app.post("/api/upload", requireAuth, upload.single("file"), ...)`
  - `app.post("/api/gemini/chat", requireAuth, ...)`
  - `app.post("/api/gemini/generate", requireAuth, ...)`
  - `app.post("/api/gemini/edit", requireAuth, ...)`
  - `app.post("/api/portfolio/inject", requireAuth, ...)`
  - (Publish endpoint dibuat di Task 7.)

- [ ] **Step 5: Verifikasi**

Run: `npm run lint` → pass.
Run: `npm run dev`, lalu `curl -i http://localhost:3001/api/upload` tanpa token → harus `401`.
Run: `npx vitest run` → semua pass.

- [ ] **Step 6: Commit**

```bash
git add server/auth.ts server/auth.test.ts server/app.ts
git commit -m "feat: add firebase-admin auth middleware and restrict CORS"
```

---

### Task 4: Quota service server-side (generate/edit/chat)

**Files:**
- Create: `server/quota.ts`
- Modify: `server/app.ts` (panggil quota di endpoint gemini)
- Test: `server/quota.test.ts`

**Interfaces:**
- Consumes: Task 3 `initAdmin()` (admin tersedia).
- Produces: `QUOTA_LIMITS`, `QuotaType`, `UsageDoc`, `evaluateUsage(doc, type)`, `getUsage(uid)`, `canSpend(uid, type)`, `markSpent(uid, type)`.

- [ ] **Step 1: Buat `server/quota.ts`**

```ts
import admin from "firebase-admin";

export const QUOTA_LIMITS = { generate: 5, edit: 7, chat: 15 } as const;
export type QuotaType = keyof typeof QUOTA_LIMITS;

export interface UsageDoc {
  generates: number;
  edits: number;
  chats: number;
  lastResetDate: string;
}

const today = () => new Date().toISOString().split("T")[0];
const defaultDoc = (): UsageDoc => ({ generates: 0, edits: 0, chats: 0, lastResetDate: today() });

export function resetIfNeeded(doc: UsageDoc): UsageDoc {
  if (doc.lastResetDate !== today()) return defaultDoc();
  return doc;
}

// Murni & bisa dites: cek + hitung langkah berikutnya.
export function evaluateUsage(doc: UsageDoc, type: QuotaType): { allowed: boolean; next: UsageDoc } {
  const current = resetIfNeeded(doc);
  const allowed = current[type] < QUOTA_LIMITS[type];
  return { allowed, next: allowed ? { ...current, [type]: current[type] + 1 } : current };
}

export async function getUsage(uid: string): Promise<UsageDoc> {
  const ref = admin.firestore().doc(`usage/${uid}`);
  const snap = await ref.get();
  return snap.exists ? resetIfNeeded(snap.data() as UsageDoc) : defaultDoc();
}

export async function canSpend(uid: string, type: QuotaType): Promise<boolean> {
  return evaluateUsage(await getUsage(uid), type).allowed;
}

export async function markSpent(uid: string, type: QuotaType): Promise<void> {
  const ref = admin.firestore().doc(`usage/${uid}`);
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const { next } = evaluateUsage(snap.exists ? (snap.data() as UsageDoc) : defaultDoc(), type);
    tx.set(ref, next);
  });
}
```

- [ ] **Step 2: Tulis test `server/quota.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { evaluateUsage, resetIfNeeded, QUOTA_LIMITS, type UsageDoc } from "./quota";

const base: UsageDoc = { generates: 0, edits: 0, chats: 0, lastResetDate: new Date().toISOString().split("T")[0] };

describe("evaluateUsage", () => {
  it("mengizinkan saat belum penuh", () => {
    const r = evaluateUsage(base, "generate");
    expect(r.allowed).toBe(true);
    expect(r.next.generates).toBe(1);
  });
  it("menolak saat limit generate tercapai", () => {
    const doc = { ...base, generates: QUOTA_LIMITS.generate };
    expect(evaluateUsage(doc, "generate").allowed).toBe(false);
  });
  it("menolak saat limit edit tercapai", () => {
    const doc = { ...base, edits: QUOTA_LIMITS.edit };
    expect(evaluateUsage(doc, "edit").allowed).toBe(false);
  });
  it("menolak saat limit chat tercapai", () => {
    const doc = { ...base, chats: QUOTA_LIMITS.chat };
    expect(evaluateUsage(doc, "chat").allowed).toBe(false);
  });
});

describe("resetIfNeeded", () => {
  it("mereset counter bila tanggal berbeda", () => {
    const old = { generates: 5, edits: 7, chats: 15, lastResetDate: "2000-01-01" };
    const r = resetIfNeeded(old);
    expect(r.generates).toBe(0);
  });
  it("tidak mereset bila tanggal sama", () => {
    const r = resetIfNeeded({ ...base, generates: 2 });
    expect(r.generates).toBe(2);
  });
});
```

- [ ] **Step 3: Run test**

Run: `npx vitest run server/quota.test.ts`
Expected: PASS.

- [ ] **Step 4: Integrasikan ke endpoint gemini di `server/app.ts`**

Tambah helper di `server/app.ts`:
```ts
import { canSpend, markSpent, type QuotaType } from "./quota.js";

async function guardQuota(uid: string, type: QuotaType, res: any): Promise<boolean> {
  const ok = await canSpend(uid, type);
  if (!ok) {
    res.status(429).json({ error: `Kamu sudah mencapai limit harian (${type}). Coba lagi besok.` });
    return false;
  }
  return true;
}
```
Di **setiap** handler yang sudah punya `req.user`:
- `/api/gemini/chat`: sebelum proses → `if (!(await guardQuota(req.user!.uid, "chat", res))) return;` — dan setelah `res.end()` sukses panggil `await markSpent(req.user!.uid, "chat")` (jangan decrement saat error).
- `/api/gemini/generate`: sama dengan `"generate"`.
- `/api/gemini/edit`: sama dengan `"edit"`.

Catatan: `markSpent` dipanggil hanya pada jalur sukses. Untuk `chat` (streaming), panggil setelah loop `for await` selesai tanpa throw.

- [ ] **Step 5: Verifikasi & commit**

Run: `npm run lint` → pass. Run: `npx vitest run` → pass.
```bash
git add server/quota.ts server/quota.test.ts server/app.ts
git commit -m "feat: enforce server-side daily quota for generate/edit/chat"
```

---

### Task 5: Validasi schema zod + error handler generic + fs async

**Files:**
- Create: `server/validation.ts`
- Modify: `server/app.ts`
- Test: `server/validation.test.ts`

**Interfaces:**
- Consumes: Task 3-4 middleware & quota.
- Produces: `chatSchema`, `generateSchema`, `editSchema`, `injectSchema`, `publishSchema` (zod), dan `validate(schema)` middleware.

- [ ] **Step 1: Install zod**

Run: `npm install zod`

- [ ] **Step 2: Buat `server/validation.ts`**

```ts
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

const messageItem = z.object({ role: z.string().max(20), content: z.string().max(4000) });

export const chatSchema = z.object({
  messages: z.array(messageItem).min(1).max(60),
});
export const generateSchema = z.object({
  messages: z.array(messageItem).max(60).optional(),
  selectedTemplate: z.enum(["obsidian","kinetic","aurora","folio","studio","nexus","pulse","manuscript"]).optional(),
  structuredData: z.record(z.any()).optional(),
});
export const editSchema = z.object({
  currentData: z.record(z.any()),
  userMessage: z.string().min(1).max(2000),
  history: z.array(messageItem).max(60).optional(),
});
export const injectSchema = z.object({ data: z.record(z.any()) });
export const publishSchema = z.object({
  data: z.record(z.any()),
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/).optional(),
});

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Data request tidak valid.", detail: parsed.error.flatten() });
    }
    req.body = parsed.data;
    next();
  };
}
```

- [ ] **Step 3: Tulis test `server/validation.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { chatSchema, publishSchema } from "./validation";

describe("chatSchema", () => {
  it("menerima messages valid", () => {
    const r = chatSchema.safeParse({ messages: [{ role: "user", content: "hai" }] });
    expect(r.success).toBe(true);
  });
  it("menolak saat messages bukan array", () => {
    expect(chatSchema.safeParse({ messages: "x" }).success).toBe(false);
  });
  it("menolak content terlalu panjang", () => {
    expect(chatSchema.safeParse({ messages: [{ role: "user", content: "x".repeat(5000) }] }).success).toBe(false);
  });
});
describe("publishSchema", () => {
  it("menolak slug dengan karakter aneh", () => {
    expect(publishSchema.safeParse({ data: {}, slug: "x y!" }).success).toBe(false);
  });
});
```

- [ ] **Step 4: Terapkan di `server/app.ts`**

- Pasang `validate(chatSchema)` sebelum handler `/api/gemini/chat`, `validate(generateSchema)` sebelum `/api/gemini/generate`, `validate(editSchema)` sebelum `/api/gemini/edit`, `validate(injectSchema)` sebelum `/api/portfolio/inject` (setelah `requireAuth`).
- Hapus akses `req.body` yang mengasumsikan struktur tanpa cek (kini zod sudah jamin struktur).

- [ ] **Step 5: Error handler generic + correlation id**

Ganti handler error global (baris 1534-1537) menjadi:
```ts
const requestId = () => (Math.random().toString(36).slice(2, 10));
app.use((err: any, req: any, res: any, next: any) => {
  const id = requestId();
  console.error(`[${id}]`, err);
  const isMulter = err instanceof multer.MulterError;
  const isValidation = err && err.type === "entity.parse.failed";
  const status = isMulter ? 400 : (isValidation ? 400 : 500);
  const message = status === 400 ? "Request tidak valid." : "Terjadi kesalahan internal. Coba lagi.";
  if (!res.headersSent) res.status(status).json({ error: message, requestId: id });
});
```
Dan di handler upload/PDF, ganti `res.status(500).json({ error: e.message })` → log detail + `res.status(500).json({ error: "Gagal memproses file" })`.

- [ ] **Step 6: Ganti fs sync jadi async di path request**

Di `/api/pdf/parse` dan `/api/upload`, ganti:
- `fs.readFileSync(req.file.path)` → `await fs.promises.readFile(req.file.path)`
- `fs.renameSync(...)` → `await fs.promises.rename(...)`
- `fs.unlinkSync(...)` → `await fs.promises.unlink(...)` (dalam try/catch `finally`, pakai `await` dan tangkap error).

- [ ] **Step 7: Verifikasi & commit**

Run: `npm run lint`, `npx vitest run` → pass.
```bash
git add server/validation.ts server/validation.test.ts server/app.ts package.json package-lock.json
git commit -m "feat: add zod validation, generic error handler, async fs"
```

---

### Task 6: Hardening upload (magic byte, 2MB, tanpa Data URI, rate limit)

**Files:**
- Modify: `server/app.ts`

**Interfaces:**
- Consumes: Task 3 `requireAuth`, Task 5 `validate` (tidak langsung), `initAdmin`.
- Produces: middleware `uploadImage` dan `uploadPdf` (terpisah).

- [ ] **Step 1: Install `file-type`**

Run: `npm install file-type`
Catatan: `file-type` v17+ adalah ESM-only. Pakai import: `import { fileTypeFromBuffer } from "file-type";`

- [ ] **Step 2: Ganti middleware multer tunggal jadi dua**

Hapus `const upload = multer({ ... })` (baris 111-122). Tambah:
```ts
import { fileTypeFromBuffer } from "file-type";

const FILE_LIMIT = 2 * 1024 * 1024; // 2MB

const multerDisk = (dest: string) =>
  multer({ dest, limits: { fileSize: FILE_LIMIT } });

const uploadImage = multerDisk(UPLOAD_DIR).single("file");
const uploadPdf = multerDisk(UPLOAD_DIR).single("file");
```
Validasi magic byte dilakukan di dalam handler (karena perlu baca buffer):
```ts
const ALLOWED_IMAGE_MAGIC = new Set(["jpg", "png", "webp"]);
async function assertMagicBytes(filePath: string, allowed: Set<string>): Promise<boolean> {
  const buf = await fs.promises.readFile(filePath);
  const type = await fileTypeFromBuffer(buf);
  return !!type && allowed.has(type.ext);
}
```

- [ ] **Step 3: Tulis ulang handler `/api/upload`**

```ts
app.post("/api/upload", requireAuth, uploadImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File tidak ada." });
  try {
    const ok = await assertMagicBytes(req.file.path, ALLOWED_IMAGE_MAGIC);
    if (!ok) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: "Tipe file tidak didukung. Hanya JPG, PNG, atau WebP." });
    }
    if (!process.env.CLOUDINARY_API_KEY) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(503).json({ error: "Upload belum dikonfigurasi." });
    }
    const tempPath = req.file.path + (path.extname(req.file.originalname) || ".jpg");
    await fs.promises.rename(req.file.path, tempPath);
    const result = await cloudinary.uploader.upload(tempPath, { folder: "openfolio", timeout: 50000 });
    await fs.promises.unlink(tempPath).catch(() => {});
    res.json({ url: result.secure_url });
  } catch (e: any) {
    console.error("[Upload]", e);
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: "Gagal mengunggah file." });
  }
});
```
Catatan: Data URI fallback **dihapus** (temuan #7).

- [ ] **Step 4: Tulis ulang handler `/api/pdf/parse`**

```ts
app.post("/api/pdf/parse", requireAuth, uploadPdf, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File tidak ada." });
  try {
    const buf = await fs.promises.readFile(req.file.path);
    const type = await fileTypeFromBuffer(buf);
    if (!type || type.ext !== "pdf") {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: "Hanya file PDF yang didukung." });
    }
    const parser = new PDFParse({ data: buf });
    const data = await parser.getText();
    res.json({ text: data.text });
  } catch (e) {
    console.error("[PDF Parse]", e);
    res.status(500).json({ error: "Gagal memproses file." });
  } finally {
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
  }
});
```

- [ ] **Step 5: Rate limit untuk upload & pdf**

Tambah di `server/app.ts` (dekat `aiRateLimiter`):
```ts
const fileLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Terlalu banyak permintaan. Coba lagi nanti." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/upload", fileLimiter);
app.use("/api/pdf/parse", fileLimiter);
```

- [ ] **Step 6: Verifikasi manual**

Run: `npm run dev`.
- `curl -i -X POST http://localhost:3001/api/upload` tanpa token → 401.
- Upload file `.txt` ber-ekstensi PDF → 400 (magic byte).
- Upload > 2MB → 400 (multer `LIMIT_FILE_SIZE`).
- Tanpa `CLOUDINARY_API_KEY` dan upload PNG valid → 503 "Upload belum dikonfigurasi".

- [ ] **Step 7: Commit**

```bash
git add server/app.ts package.json package-lock.json
git commit -m "feat: harden upload with magic bytes, 2MB limit, no Data URI fallback"
```

---

## Phase C — Publish & Firestore Rules

### Task 7: Firestore rules + endpoint publish + publicPortfolios

**Files:**
- Modify: `firestore.rules`
- Modify: `server/app.ts` (endpoint publish + rate limit)

**Interfaces:**
- Consumes: Task 3 `requireAuth`, Task 5 `publishSchema` + `validate`, Task 1 `slugify`/`sanitizePortfolioData`/`buildPortfolioHTMLString`.
- Produces: `POST /api/portfolio/publish` → `{ url }`.

- [ ] **Step 1: Tulis `firestore.rules`**

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /publicPortfolios/{slug} {
      allow read: if true;
      allow write: if false;
    }
    match /portfolios/{docId} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    match /usage/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```
Koleksi `users` tidak lagi di-match (dihapus).

- [ ] **Step 2: Tambah endpoint publish di `server/app.ts`**

```ts
app.post("/api/portfolio/publish", requireAuth, validate(publishSchema), async (req, res) => {
  try {
    const { data, slug } = req.body;
    const clean = sanitizePortfolioData(data);
    const html = buildPortfolioHTMLString(clean);
    const baseSlug = slug || slugify(clean.name || "portfolio");
    const col = admin.firestore().collection("publicPortfolios");
    let finalSlug = baseSlug;
    for (let i = 1; i <= 5; i++) {
      const snap = await col.doc(finalSlug).get();
      if (!snap.exists) break;
      finalSlug = `${baseSlug}-${i}`;
    }
    await col.doc(finalSlug).set({ html, name: clean.name || "", updatedAt: new Date().toISOString() });
    res.json({ url: `/p/${finalSlug}` });
  } catch (e) {
    console.error("[Publish]", e);
    res.status(500).json({ error: "Gagal mempublikasikan portfolio." });
  }
});

const publishLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Terlalu banyak publish. Coba lagi nanti." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/portfolio/publish", publishLimiter);
```
Import `admin` (dari `firebase-admin`) dan `slugify`, `sanitizePortfolioData`, `buildPortfolioHTMLString` di `server/app.ts`.

- [ ] **Step 3: Verifikasi**

Run: `npm run lint` → pass.
Run: `npm run dev`, `curl -i -X POST http://localhost:3001/api/portfolio/publish` tanpa token → 401. Dengan token valid dan body `{ data: { name: "Test" } }` → `{ url: "/p/test" }`.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules server/app.ts
git commit -m "feat: add publish endpoint and new firestore rules"
```

---

## Phase D — Client Guest-Only

### Task 8: Anonymous auth + api helper + notifikasi

**Files:**
- Modify: `src/lib/firebase.ts`
- Create: `src/lib/api.ts`
- Create: `src/lib/notify.ts`
- Create: `src/components/ToastHost.tsx`
- Modify: `src/main.tsx` (panggil ensureAnonSession), `src/components/AppLayout.tsx` (render ToastHost)

**Interfaces:**
- Consumes: tidak ada.
- Produces: `ensureAnonSession()`, `apiFetch<T>(path, options)`, `showToast(message)`, `<ToastHost />`.

- [ ] **Step 1: Update `src/lib/firebase.ts`**

- Hapus `export const googleProvider = new GoogleAuthProvider();` dan import `GoogleAuthProvider`.
- Tambah:
```ts
import { signInAnonymously } from "firebase/auth";

export async function ensureAnonSession(): Promise<void> {
  if (auth.currentUser) return;
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.warn("Anonymous auth gagal:", e);
  }
}
```

- [ ] **Step 2: Buat `src/lib/notify.ts`**

```ts
type Listener = (message: string) => void;
let listener: Listener | null = null;
export function setToastListener(fn: Listener) { listener = fn; }
export function showToast(message: string) { listener?.(message); }
```

- [ ] **Step 3: Buat `src/lib/api.ts`**

```ts
import { auth } from "./firebase";
import { showToast } from "./notify";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, "Sesi tidak tersedia.");
  return user.getIdToken();
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  let token: string;
  try { token = await getToken(); }
  catch (e) { throw new ApiError(401, "Sesi tidak tersedia."); }

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = "Terjadi kesalahan.";
    try { const body = await res.json(); message = body.error || message; } catch {}
    if (res.status === 429) showToast(message);
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}
```

- [ ] **Step 4: Buat `src/components/ToastHost.tsx`**

```tsx
import { useEffect, useState } from "react";
import { setToastListener } from "../lib/notify";

export default function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    setToastListener((m) => {
      setMsg(m);
      setTimeout(() => setMsg(null), 4000);
    });
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] rounded-xl bg-zinc-900 text-white px-5 py-3 text-sm shadow-xl border border-white/10">
      {msg}
    </div>
  );
}
```

- [ ] **Step 5: Integrasikan di `src/main.tsx` dan `AppLayout`**

- `src/main.tsx`: panggil `ensureAnonSession()` saat init (jangan `await` di render; gunakan `.catch`). Contoh:
```tsx
import { ensureAnonSession } from "./lib/firebase";
ensureAnonSession();
```
- `src/components/AppLayout.tsx`: render `<ToastHost />` di dalam layout.

- [ ] **Step 6: Verifikasi & commit**

Run: `npm run lint`, `npm run build` → pass.
```bash
git add src/lib/firebase.ts src/lib/api.ts src/lib/notify.ts src/components/ToastHost.tsx src/main.tsx src/components/AppLayout.tsx
git commit -m "feat: add silent anonymous auth, api helper, and toast notifications"
```

---

### Task 9: Hapus semua UI login (guest-only)

**Files:**
- Delete: `src/pages/LoginPage.tsx`
- Modify: `src/App.tsx` (hapus route /login), `src/components/AppLayout.tsx` (hapus signOut), `src/components/SessionManager.tsx` (sederhanakan), `src/components/SmartOnboarding.tsx` (localStorage-only), `src/pages/SettingsPage.tsx` (hapus section akun & import firebase auth)

**Interfaces:**
- Consumes: Task 8.
- Produces: tidak ada UI login tersisa; `auth` tetap ada untuk anon session.

- [ ] **Step 1: Hapus route & file login**

- `src/App.tsx`: hapus `import LoginPage` dan `<Route path="/login" ... />`.
- Hapus file `src/pages/LoginPage.tsx` (git rm).

- [ ] **Step 2: Hapus sign out di `src/components/AppLayout.tsx`**

- Hapus import `signOut` dan tombol sign out (sekitar baris 103).

- [ ] **Step 3: Sederhanakan `SessionManager.tsx`**

- Ganti logika user/guest menjadi selalu guest: hapus branching `user` vs `guest`, gunakan prefix storage `openfolio_session_guest`. Pertahankan `onAuthStateChanged` hanya untuk menunggu `auth.currentUser` tersedia (anon session), tidak untuk UI login.

- [ ] **Step 4: `SmartOnboarding.tsx` → localStorage-only**

- Hapus `import { db } ...`, `getDoc`, `setDoc`, dan blok yang baca/tulis `users/{uid}`.
- `checkStatus` cukup pakai `localStorage.getItem(localKey)` (guest key `openfolio_onboarding_guest`).
- `completeOnboardingData` cukup `localStorage.setItem(...)`.

- [ ] **Step 5: Hapus section akun di `SettingsPage.tsx`**

- Hapus import `updateProfile, deleteUser, signOut` dari `firebase/auth`.
- Hapus bagian UI "Account"/akun (update nama, delete account, sign out) yang diguard `auth.currentUser &&`.
- Biarkan bagian statistik kuota (akan di-rewrite di Task 10).

- [ ] **Step 6: Verifikasi & commit**

Run: `npm run lint`, `npm run build` → pass. Cek tidak ada referensi `LoginPage`/`signOut` tersisa: `rg "LoginPage|signOut|googleProvider|createUserWithEmail" src`.
```bash
git add -A src
git commit -m "feat: remove all login/signup UI, app is guest-only"
```

---

### Task 10: Rewrite UsageService → pembaca kuota + tampilan Settings

**Files:**
- Modify: `src/lib/UsageService.ts` (rewrite), `src/pages/SettingsPage.tsx` (tampilan limit)
- Modify: `src/pages/CanvasPage.tsx` (ganti panggilan canGenerate/trackUsage — hanya yang display)

**Interfaces:**
- Consumes: Task 8 `apiFetch`/`auth`, Task 4 quota limits.
- Produces: `QuotaLimits`, `getQuota(uid)` → `QuotaSnapshot`, `remaining(quota, type)`.

- [ ] **Step 1: Rewrite `src/lib/UsageService.ts`**

```ts
import { db, auth } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export const QuotaLimits = { generate: 5, edit: 7, chat: 15 } as const;
export type QuotaType = keyof typeof QuotaLimits;

export interface QuotaSnapshot {
  generates: number;
  edits: number;
  chats: number;
  lastResetDate: string;
}

const today = () => new Date().toISOString().split("T")[0];
const empty = (): QuotaSnapshot => ({ generates: 0, edits: 0, chats: 0, lastResetDate: today() });

export async function getQuota(): Promise<QuotaSnapshot> {
  const user = auth.currentUser;
  if (!user) return empty();
  try {
    const snap = await getDoc(doc(db, "usage", user.uid));
    if (!snap.exists()) return empty();
    const data = snap.data() as QuotaSnapshot;
    if (data.lastResetDate !== today()) return empty();
    return data;
  } catch (e) {
    console.warn("Gagal membaca kuota:", e);
    return empty();
  }
}

export function remaining(quota: QuotaSnapshot, type: QuotaType): number {
  return Math.max(0, QuotaLimits[type] - quota[type]);
}
```

- [ ] **Step 2: Update `SettingsPage.tsx`**

- Ganti pemakaian `UsageService.getUsage(user?.uid)` → `getQuota()` (tanpa argumen, ambil dari `auth.currentUser`).
- Render kartu statistik dengan `remaining(quota, "generate")`, `remaining(quota, "edit")`, `remaining(quota, "chat")`, format "Generate 2/5".
- Hapus teks limit lama (20000/50000 token).

- [ ] **Step 3: Update `CanvasPage.tsx` untuk quota display**

- Ganti `UsageService.canGenerate(user?.uid)` / `trackUsage(...)` → logika display: sebelum action besar, jika `remaining(quota, "generate") === 0` tampilkan toast "Limit harian tercapai" dan blokir.
- `trackUsage` dihapus (server yang menghitung). Refresh quota via `getQuota()` setelah sukses build.
- Referensi `USAGE_LIMITS` lama dihapus.

- [ ] **Step 4: Verifikasi & commit**

Run: `npm run lint`, `npm run build` → pass.
```bash
git add src/lib/UsageService.ts src/pages/SettingsPage.tsx src/pages/CanvasPage.tsx
git commit -m "feat: rewrite usage as server-backed quota display"
```

---

## Phase E — Canvas & Public Page

### Task 11: Perbaikan CanvasPage (setDoc merge, chat history, inject, sandbox, publish, upload reminder)

**Files:**
- Modify: `src/pages/CanvasPage.tsx`

**Interfaces:**
- Consumes: Task 7 publish endpoint, Task 8 `apiFetch`, Task 10 quota.
- Produces: tidak ada baru.

- [ ] **Step 1: `setDoc` tanpa merge → `{ merge: true }`**

Di 3 tempat (baris 744-751, 1008-1017, 1154-1163), ubah `setDoc(docRef, data)` menjadi `setDoc(docRef, data, { merge: true })`. Pastikan `pinned`, `createdAt`, dan metadata lain tidak di-reset (temuan #15). Buang hardcode `pinned: false` bila ada.

- [ ] **Step 2: Chat history — simpan `finalMessages` dulu**

Di blok generate (baris 1008-1014, 1047-1060), buat `finalMessages` sebelum persist & setState, simpan & set dari array yang sama (temuan #16).

- [ ] **Step 3: `callInjectAPI` lempar error, bukan HTML fallback**

Di `callInjectAPI` (baris 849-862), hapus return `"<html><body>Gagal render.</body></html>"`. Ganti dengan `throw new Error("Gagal render portfolio.")`. Caller menangkap error dan tidak persist fallback (temuan #18).

- [ ] **Step 4: Sandbox iframe**

Di 2 tempat (baris 1937, 2140), ganti `sandbox="allow-scripts allow-same-origin"` → `sandbox="allow-scripts"` (temuan #3).

- [ ] **Step 5: Tombol publish → panggil endpoint**

Ganti logic publish dari menulis `portfolios/{id}` + `isPublished` langsung menjadi:
```ts
import { apiFetch } from "../lib/api";
const result = await apiFetch<{ url: string }>("/api/portfolio/publish", {
  method: "POST",
  body: JSON.stringify({ data: currentData, slug: undefined }),
});
// navigasi ke result.url
```
Simpan draft pribadi tetap ke `portfolios/{docId}` (dengan merge), hanya alur publish yang lewat server.

- [ ] **Step 6: Reminder upload 2MB**

Di form upload image (baris ~1251-1267 & 1393-1415): tambah teks "Maksimal 2 MB" dan validasi client:
```ts
if (file.size > 2 * 1024 * 1024) {
  alert("Ukuran file melebihi 2 MB.");
  return;
}
```
Samakan dengan batas server. Untuk CV upload: panggil `/api/pdf/parse` dengan `FormData` (via `apiFetch` dengan header tanpa Content-Type manual) dan simpan teks hasil ke state; bila belum sempat, sembunyikan input CV.

- [ ] **Step 7: Verifikasi & commit**

Run: `npm run lint`, `npm run build` → pass.
```bash
git add src/pages/CanvasPage.tsx
git commit -m "fix: canvas merge writes, chat history, inject errors, sandbox, publish flow"
```

---

### Task 12: PublicPortfolioPage baca publicPortfolios + sandbox

**Files:**
- Modify: `src/pages/PublicPortfolioPage.tsx`

**Interfaces:**
- Consumes: Task 7 collection `publicPortfolios/{slug}`.
- Produces: halaman publik tampil anonim.

- [ ] **Step 1: Baca dari `publicPortfolios`**

Ganti `doc(db, 'portfolios', id)` → `doc(db, 'publicPortfolios', id)`. Hapus cek `data.isPublished`; cukup gunakan `data.html` (field baru).

- [ ] **Step 2: Sandbox iframe**

Di iframe public (baris 70-74), tambah `sandbox="allow-scripts"`.

- [ ] **Step 3: Verifikasi & commit**

Run: `npm run lint`, `npm run build` → pass.
```bash
git add src/pages/PublicPortfolioPage.tsx
git commit -m "fix: public portfolio reads publicPortfolios with sandbox"
```

---

## Phase F — Cleanup & Kualitas

### Task 13: Hapus unused deps/import & rapikan file root

**Files:**
- Modify: `package.json` (hapus `mustache`, `@types/mustache`), `server/app.ts`, `src/pages/SettingsPage.tsx`, `src/components/AppLayout.tsx`, `src/pages/CanvasPage.tsx`
- Move: `replace*.cjs`, `test_*.ts`, `test_sim.mjs`, `list_models.ts` → `scripts/archive/` atau hapus

**Interfaces:**
- Consumes: tidak ada.
- Produces: repo lebih bersih.

- [ ] **Step 1: Hapus `mustache`**

Run: `npm uninstall mustache @types/mustache`
Hapus sisa import `mustache` bila ada di `server/app.ts`.

- [ ] **Step 2: Hapus import/dead code**

Gunakan `rg` untuk menemukan: `TEMPLATES`, `uploadedPhotoUrl`, `logoHtml`, import Firestore yang tidak dipakai di `CanvasPage`, import `User`/`onAuthStateChanged` yang tidak lagi dipakai setelah Task 9. Hapus satu per satu.

- [ ] **Step 3: Pindahkan script & test manual**

- Buat folder `scripts/archive/`.
- `git mv replace.cjs replace_canvas.cjs replace_canvas_3xl.cjs replace_indo.cjs replace_settings_color.cjs scripts/archive/`
- `git mv test_25.ts test_36.ts test_36_old_key.ts test_edit.ts test_env.ts test_gemini.ts test_keys.ts test_keys2.ts test_models.ts test_parse.ts test_sim.mjs list_models.ts scripts/archive/`

- [ ] **Step 4: Hapus scaffolding AI Studio yang tidak relevan (verifikasi dulu)**

Cek isi `metadata.json` dan `taste-SKILL.md` — bila hanya scaffolding AI Studio (bukan konten project), `git rm` keduanya. Bila ada nilai, pindah ke `docs/`.

- [ ] **Step 5: Verifikasi & commit**

Run: `npm run lint`, `npm run build`, `npx vitest run` → pass.
```bash
git add -A
git commit -m "chore: remove unused deps, archive one-off scripts, clean scaffolding"
```

---

### Task 14: Resolve npm audit

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: tidak ada.
- Produces: `npm audit --omit=dev` dengan residual minimal terdokumentasi.

- [ ] **Step 1: Upgrade dependency rentan**

Run: `npm install react-router-dom@latest firebase-admin@latest`
(Rincian: `react-router-dom@^7` versi patched untuk GHSA-qwww-vcr4-c8h2.)

- [ ] **Step 2: Jalankan audit & dokumentasikan residual**

Run: `npm audit --omit=dev`
Catat sisa vulnerability. Residual moderate transitif dari `google-gax`/`gaxios` (via `firebase-admin`) yang tidak punya fix diterima & didokumentasikan (firebase-admin sekarang wajib untuk auth). Tulis ke `SECURITY.md` (dibuat di Task 15) atau README bagian "Known vulnerabilities".

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade react-router-dom and firebase-admin to resolve audit"
```

---

### Task 15: Aktifkan TypeScript strict bertahap

**Files:**
- Modify: `tsconfig.json`, `server/app.ts`, `server/portfolio-render.ts`, `src/**`

**Interfaces:**
- Consumes: semua task sebelumnya.
- Produces: `tsc --noEmit` dalam mode strict.

- [ ] **Step 1: Aktifkan strict**

Ubah `tsconfig.json`:
```json
"strict": true,
"noImplicitAny": true,
"noUncheckedIndexedAccess": true,
"skipLibCheck": true
```

- [ ] **Step 2: Fix error secara iteratif**

Run: `npm run lint`. Perbaiki error satu per satu, mulai dari `server/*.ts` (sudah banyak tipe diimpor), lalu `src/lib/*`, lalu `src/pages/*`. Untuk objek `req.body` yang sudah di-parse zod, gunakan tipe hasil zod (`z.infer<typeof chatSchema>`) sebagai tipe handler. Untuk file besar seperti `CanvasPage`, perbaiki tipe `any` yang memungkinkan; untuk yang tidak praktis, tambah tipe eksplisit pada parameter handler (jangan `// @ts-nocheck` kecuali disepakati di plan review).

- [ ] **Step 3: Verifikasi & commit**

Run: `npm run lint` (zero error), `npm run build`, `npx vitest run` → pass.
```bash
git add -A
git commit -m "refactor: enable typescript strict mode and fix type errors"
```

---

## Phase G — Open Source Readiness

### Task 16: Open source packaging (LICENSE, config contoh, README, CI, SECURITY.md)

**Files:**
- Create: `LICENSE`, `firebase-applet-config.example.json`, `.github/workflows/ci.yml`, `SECURITY.md`
- Modify: `.gitignore`, `README.md`, `.env.example`

**Interfaces:**
- Consumes: semua task.
- Produces: repo siap dipublikasi (mitigate risiko secret).

- [ ] **Step 1: Tambah LICENSE (MIT)**

Buat `LICENSE` berisi teks MIT lengkap dengan tahun `2026` dan holder `miqdadbadzubair-design`.

- [ ] **Step 2: Config Firebase jadi contoh**

- Buat `firebase-applet-config.example.json`:
```json
{
  "apiKey": "YOUR_FIREBASE_WEB_API_KEY",
  "authDomain": "YOUR_PROJECT.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID"
}
```
- `.gitignore`: tambah `firebase-applet-config.json`.
- `git rm --cached firebase-applet-config.json` (file asli tidak lagi di-track).
- Update `src/lib/firebase.ts` agar impor config dari file yang ada; jika config asli tidak ada, fallback ke env `VITE_FIREBASE_*` (sudah begitu) — pastikan tidak import file yang hilang tanpa fallback.

- [ ] **Step 3: Lengkapi `.env.example`**

Tambahkan:
```
# Firebase Admin (server-side auth & quota)
FIREBASE_PROJECT_ID=""
FIREBASE_ADMIN_CLIENT_EMAIL=""
FIREBASE_ADMIN_PRIVATE_KEY=""
# CORS
CORS_ORIGIN="http://localhost:3001"
```
Pindahkan komentar Gemini ke `GEMINI_API_KEY` (hapus `GEMINI_API_KEY_NEW`).

- [ ] **Step 4: Tulis ulang `README.md`**

Cover: deskripsi project, arsitektur (Vercel), setup lokal (`npm install`, `.env.local`, `npm run dev`), deploy Vercel (env vars), setup Firebase (aktifkan Anonymous Auth, deploy `firestore.rules`, buat service account), Cloudinary, Gemini, kuota default, dokumentasi endpoint.

- [ ] **Step 5: Buat `.github/workflows/ci.yml`**

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npx vitest run
      - run: npm audit --omit=dev --audit-level=high
```

- [ ] **Step 6: Buat `SECURITY.md`**

Template singkat: cara melapor vulnerability, daftar dependensi dengan residual audit + alasannya.

- [ ] **Step 7: Verifikasi & commit**

Run: `npm run lint`, `npm run build`, `npx vitest run`, `git status` (pastikan tidak ada `.env`, `firebase-applet-config.json`, service account yang ter-track).
```bash
git add -A
git commit -m "chore: prepare open source packaging (LICENSE, config example, CI, README)"
```

---

### Task 17: Verifikasi akhir & secret scan

**Files:**
- Modify: tidak ada (verifikasi)

**Interfaces:**
- Consumes: semua task.

- [ ] **Step 1: Jalankan verifikasi penuh**

Run: `npm run lint`, `npm run build`, `npx vitest run`, `npm audit --omit=dev`.
Semua harus pass (audit: residual terdokumentasi).

- [ ] **Step 2: Secret scan**

Run:
```bash
rg -i --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!dist/**' "(AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35}|sk-[a-zA-Z0-9]{20,})" .
```
Expected: hanya placeholder/template yang muncul, tidak ada key live.

- [ ] **Step 3: Uji manual checklist**

- `npm run dev` → `/api/health` OK.
- Upload PNG valid dengan Cloudinary → URL cloudinary; tanpa Cloudinary → 503.
- Upload `.txt` → 400. Upload >2MB → 400.
- `POST /api/gemini/chat` tanpa token → 401; dengan token → stream; habis kuota → 429.
- Publish → `/p/{slug}` tampil di tab incognito (anonim).
- Iframe portfolio: jalankan script di preview → tidak bisa akses `window.parent.localStorage`.

- [ ] **Step 4: Siapkan publish ke repo GitHub**

- Buat branch `main` (atau push `master` ke repo existing) — konfirmasi preferensi repo dengan user.
- Pastikan `git remote` mengarah ke repo GitHub yang sudah ada.
- Setelah user siap: `git add -A && git commit && git push` (seluruh isi repo lama diganti — sesuai spec 9.1).

- [ ] **Step 5: Commit akhir**

```bash
git add -A
git commit -m "chore: final verification checklist"
```
