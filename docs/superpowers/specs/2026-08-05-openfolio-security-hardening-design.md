# OpenFolio AI — Security Hardening & Guest-Only Redesign

Tanggal: 2026-08-05
Status: Design disetujui
Sumber: `AUDIT_KEAMANAN_KODE_2026-08-05.md` (23 temuan, prioritas sesuai audit)

## 1. Konteks & Keputusan

Project OpenFolio AI adalah **public portfolio generator** berbasis React SPA + Express server monolith. Hasil audit: belum siap production. Keputusan yang diambil bersama user:

- **Target deploy: Vercel** (server jadi serverless function, bukan monolith `app.listen`).
- **Hapus login/daftar total** → **guest-only** dengan Firebase Anonymous Auth (silent, tanpa UI).
- App tetap **public generator** — pengunjung bisa pakai AI/chat/canvas buat bikin portfolio sendiri.
- **Quota harian berbasis operasi** (bukan token): generate **5x/hari**, edit **7x/hari**, chat **15x/hari**, di-enforce server, ada notifikasi saat kena limit, dan ditampilkan di Settings.
- **Upload max 2MB** (image & PDF) + reminder di UI.
- **Open source** (MIT): README ditulis ulang, config Firebase jadi template contoh, LICENSE ditambah.
- **Deferred (di luar scope plan ini):** perbaikan UI landing page dan layout mobile.

Pendekatan dipilih: **Approach B — Anonymous Auth + server-enforced quota + rate limit per-IP**, tanpa App Check (tidak butuh GCP billing). App Check dijadikan upgrade path bila abuse meningkat.

## 2. Arsitektur & Deployment (Vercel)

### 2.1 Struktur file

- `server.ts` → refactor tipis: **export `app`** (Express app, semua route & middleware). `app.listen` hanya jalan saat local dev (guard `process.env.VERCEL`).
- `api/index.ts` (baru) → entry serverless Vercel:
  ```ts
  import { app } from "../server";
  export default app;
  ```
- Server **tidak lagi menyajikan static** di production — Vercel CDN yang serve SPA. Ini menyelesaikan temuan #1 (server bundle & sourcemap tidak pernah berada di folder static).

### 2.2 `vercel.json`

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

Catatan `frame-ancestors`/`X-Frame-Options`: mencegah app di-embed ke situs lain (anti-clickjacking). Tidak menghalangi portfolio di iframe internal karena itu srcDoc di dokumen yang sama.

### 2.3 Scripts package.json

- `dev`: dev-server lokal (Vite middleware + Express, seperti sekarang).
- `build`: `vite build` saja (client). Server dibundle oleh Vercel.
- `start`: tidak relevan di Vercel, dihapus atau disisakan untuk dev — putuskan di plan.
- `clean`: pakai `rimraf` (portable Windows) — temuan #21.

### 2.4 PORT

`const PORT = Number(process.env.PORT || 3001);` hanya untuk local dev. Di Vercel handler di-invoke langsung.

## 3. Auth & Anti-Abuse

### 3.1 Anonymous Auth (silent)

- `src/lib/firebase.ts`: hapus `googleProvider`. Tambah `ensureAnonSession()` yang memanggil `signInAnonymously()` sekali saat app init. Gagal → tampilkan banner "setup error", fitur AI nonaktif (tidak crash).
- Semua panggilan API via helper `src/lib/api.ts` yang:
  - Mengambil ID token via `getIdToken()`.
  - Menambahkan header `Authorization: Bearer <idToken>`.
  - Menangani respons 401 (token invalid → re-auth), 429 (limit → notifikasi), 403, 503 (model sibuk) secara generik.

### 3.2 Server middleware `requireAuth`

```ts
const authHeader = req.headers.authorization || "";
const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
const decoded = await admin.auth().verifyIdToken(token); // firebase-admin
req.user = decoded; // { uid, ... }
```

Dipakai di endpoint mahal: `/api/gemini/*`, `/api/upload`, `/api/pdf/parse`, `/api/portfolio/publish`. `/api/health` tetap terbuka. `firebase-admin` sekarang benar-benar digunakan (sebelumnya unused).

### 3.3 Quota harian per-uid (server-enforced)

- Disimpan di Firestore `usage/{uid}`: `{ generates, edits, chats, lastResetDate }`.
- Server `canSpend(uid, "generate"|"edit"|"chat")` → baca doc, reset bila `lastResetDate != hari ini`, cek counter < limit.
- Setelah sukses, server increment counter.
- **Limit:** generate 5, edit 7, chat 15 per hari (UTC). Definisi: setiap `POST /api/gemini/generate` = 1 generate, setiap `POST /api/gemini/edit` = 1 edit, setiap `POST /api/gemini/chat` = 1 chat.
- Client **hanya membaca** sisa quota (rules izinkan owner read) untuk tampilan Settings — tidak pernah menulis.
- Client localStorage tetap dipakai sebagai cache tampilan, tapi bukan otoritatif.

### 3.4 Rate limit & CORS

- `express-rate-limit` per-IP (in-memory, best-effort di serverless — dicatat sebagai limitasi; backstop = quota Firestore):
  - `/api/gemini/*`: 15/min
  - `/api/upload` & `/api/pdf/parse`: 10/min
  - `/api/portfolio/publish`: 5/min
- CORS: `cors({ origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3001"] })` — bukan `*`. Menambah defense-in-depth; pemakaian normal same-origin via Vercel proxy tidak terpengaruh.

## 4. Data Model & Firestore Rules

### 4.1 Rules baru (`firestore.rules`)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Snapshot portfolio publik — dibaca semua orang, ditulis hanya server (Admin SDK bypass rules)
    match /publicPortfolios/{slug} {
      allow read: if true;
      allow write: if false;
    }
    // Draft pribadi — hanya pemilik (uid anonim) yang bisa baca/tulis
    match /portfolios/{docId} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    // Kuota — dibaca pemilik, ditulis hanya server
    match /usage/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

- Koleksi `users` **dihapus** (onboarding jadi localStorage-only).

### 4.2 Flow publish (draft → public)

1. Canvas: tombol Publish → `POST /api/portfolio/publish` `{ data, slug? }` + token.
2. Server: verifikasi token, sanitize `data` lewat `sanitizePortfolioData` yang sudah ada, render HTML via `buildPortfolioHTMLString`, tulis snapshot aman ke `publicPortfolios/{slug}` via Admin SDK.
3. `slug` dihasilkan dari `name` (slugify) + fallback suffix acak bila tabrakan.
4. Respons: URL `/p/{slug}`.
5. `PublicPortfolioPage` membaca dari `publicPortfolios/{id}` (public read), bukan `portfolios`.

Snapshot publik hanya berisi field aman (HTML ter-render + `name` + `updatedAt`) — field private seperti `messages`/`content` tidak pernah dipublikasikan (temuan #4).

## 5. Upload & PDF

- Pisah middleware multer:
  - `uploadImage`: hanya `image/jpeg|png|webp` — **SVG dilarang** (temuan #6). Digunakan di `/api/upload`.
  - `uploadPdf`: hanya `application/pdf`. Digunakan di `/api/pdf/parse`.
- **Validasi magic byte** dengan `file-type` (tidak percaya `file.mimetype` dari client).
- **Limit 2MB** di kedua route; client menampilkan reminder "Maksimal 2 MB" dan validasi ukuran sebelum upload. Disamakan client & server.
- **Hapus fallback Data URI** (temuan #7): bila `CLOUDINARY_API_KEY` tidak ada → `503 { error: "Upload belum dikonfigurasi" }` (fail fast, tidak ada bloat base64).
- Operasi `fs` sync di request path → `fs.promises` async (temuan #12).
- Auth + rate limit di kedua endpoint (Bagian 3).

## 6. Iframe Sandbox & Security Headers

### 6.1 Sandbox

- Ganti `sandbox="allow-scripts allow-same-origin"` → `sandbox="allow-scripts"` di **2 tempat CanvasPage** dan **PublicPortfolioPage** (temuan #3). Portofolio jadi opaque origin — script di dalamnya tidak bisa menyentuh localStorage/session parent.
- Tailwind CDN, Google Fonts, dan script observer portfolio tetap berjalan (external, tidak butuh same-origin).

### 6.2 CSP (trade-off didokumentasikan)

- Portfolio di-render via `srcDoc`, dan dokumen srcdoc **mewarisi CSP parent**. Karena portfolio butuh `cdn.tailwindcss.com` + script inline, CSP parent tidak bisa `script-src 'self'` murni.
- CSP pragmatis di `vercel.json`:
  - `script-src 'self' https://cdn.tailwindcss.com 'unsafe-inline'`
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com`
  - `font-src 'self' https://fonts.gstatic.com`
  - `img-src 'self' data: https:`
  - `frame-ancestors 'none'`
- Isolasi utama tetap **sandbox iframe** (opaque origin). CSP adalah defense-in-depth. Jika di masa depan portfolio dipindah ke origin terpisah, CSP bisa diperketat.

## 7. Server Hardening

- **Env Gemini distandarkan** (temuan #13): `const API_KEY = process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY; if (!API_KEY) throw ...`. `.env.example` & README pakai `GEMINI_API_KEY`.
- **Error handler** (temuan #8): log detail di server (termasuk correlation id), respons client generic ("Gagal memproses file", dll). Map error: multer/schema → 400, quota → 429, model sibuk → 503.
- **Validasi schema zod** (temuan #11): `chat` (messages array, batas jumlah & panjang), `generate` (messages, `selectedTemplate` enum, `structuredData` object), `edit` (`currentData`, `userMessage`, `history`), `inject` (`data`), `publish` (`data`, `slug`). Body invalid → 400.
- **Hapus `mustache`** (import & dependency, tidak terpakai — temuan #22).

## 8. Perubahan Client

- **Hapus UI login:** `LoginPage` dari route, section akun di `SettingsPage` (update profile, delete account, sign out), tombol sign out di `AppLayout`, `SessionManager` disederhanakan (selalu guest, prefix storage `guest_`).
- **`SmartOnboarding`:** localStorage-only, hapus baca/tulis `users/{uid}`.
- **`UsageService`:** ditulis ulang menjadi pembaca quota (read dari Firestore `usage/{uid}`) untuk display; tidak ada lagi `trackUsage` di client.
- **`SettingsPage`:** tampilkan sisa limit: "Generate 2/5 · Edit 4/7 · Chat 8/15" + reset otomatis per hari.
- **Notifikasi limit:** toast/banner ringan (state-based, tanpa library baru) muncul saat API balas 429 atau saat client tahu quota habis.
- **`CanvasPage`:**
  - `setDoc` → `{ merge: true }` di 3 tempat (preserve `pinned`/`createdAt`, temuan #15).
  - Simpan `finalMessages` sebelum setState (temuan #16).
  - `callInjectAPI` melempar error ke caller, tidak return HTML fallback (temuan #18).
  - Iframe sandbox (Bagian 6).
  - CV upload: wiring ke `/api/pdf/parse` (endpoint sudah ada & terproteksi) atau sembunyikan input sampai fitur selesai — diputuskan di plan (temuan #17).
  - Form upload: reminder "Maksimal 2 MB" + validasi ukuran.
- **`PublicPortfolioPage`:** baca `publicPortfolios/{id}`, sandbox iframe.

## 9. Open Source Readiness

- Tambah **LICENSE (MIT)**.
- `firebase-applet-config.json` (berisi project ID & web API key live) → **di-git-ignore**; commit `firebase-applet-config.example.json` berisi placeholder + dokumentasi cara bikin project Firebase sendiri.
- **README ditulis ulang**: arsitektur, setup lokal, deploy Vercel, env vars lengkap, cara aktifkan Anonymous Auth, deploy Firestore rules, buat service account untuk `firebase-admin`, konfigurasi Cloudinary & Gemini.
- **`.env.example`** dilengkapi semua var: `GEMINI_API_KEY`, `CLOUDINARY_*`, `FIREBASE_ADMIN_PRIVATE_KEY`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID`, `CORS_ORIGIN`.
- **GitHub Actions** (opsional): `lint` + `build` + `npm audit --omit=dev` di tiap PR.
- Bersihkan scaffolding AI Studio yang tidak relevan (`metadata.json`, `taste-SKILL.md`) — diverifikasi saat implementasi.
- Hapus/mindahkan `replace*.cjs` dan `test_*.ts` ke `scripts/archive/` (temuan #20, #23).

## 10. Kualitas & Cleanup

- **npm audit** (temuan #5): upgrade `react-router-dom` ke versi patched, `firebase-admin` ke latest, jalankan ulang `npm audit --omit=dev`. Residual moderate transitif (google-gax/gaxios dan sejenisnya) didokumentasikan dengan alasan — `firebase-admin` sekarang diperlukan untuk auth.
- **TypeScript strict** (temuan #19): aktifkan `strict` + `noImplicitAny` bertahap, mulai dari shared zod schema & server. Item effort terbesar — dijadwalkan sebagai tahap akhir.
- **ESLint** dengan `no-unused-vars` (opsional, mempermudah cleanup).
- Hapus import/dependency unused (`mustache`, `TEMPLATES`, `uploadedPhotoUrl`, `logoHtml`, dll).

## 11. Deferred (di luar scope)

- Perbaikan UI **landing page**.
- Perbaikan **layout mobile** (terutama `CanvasPage`).

## 12. Model Ancaman Ringkas

Yang dilindungi & cara:
- **Gemini API (biaya)** → anonymous auth + quota harian per-uid + rate limit.
- **Cloudinary upload (abuse)** → auth + rate limit + magic byte + 2MB + tanpa Data URI.
- **PDF parse (CPU)** → auth + rate limit + 2MB.
- **XSS same-origin via portfolio HTML** → sandbox iframe `allow-scripts` (opaque origin) + CSP.
- **Clickjacking** → `frame-ancestors 'none'`.
- **Error info leak** → generic message + server-side logging.

Limitasi yang diketahui (Approach B):
- Attacker yang tekun bisa rotasi anon uid untuk quota baru; mitigasi utama adalah rate limit + App Check sebagai upgrade path.
- Rate limit in-memory di serverless tidak konsisten antar-instance; backstop = quota Firestore. Upgrade ke Vercel KV mudah.

## 13. Pengujian

- `npm run lint` (tsc --noEmit) lulus.
- `npm run build` (vite) lulus, tanpa server bundle di `dist/`.
- `npm audit --omit=dev` — residual didokumentasikan.
- Manual: upload image valid & invalid (magic byte), upload >2MB ditolak, PDF parse, publish → `/p/:slug` tampil anonim, quota habis → 429 + notifikasi, reset harian, iframe portfolio tidak bisa akses parent localStorage.
- Vercel preview deploy: SPA route, `/api/health`, endpoint terproteksi balas 401 tanpa token.
