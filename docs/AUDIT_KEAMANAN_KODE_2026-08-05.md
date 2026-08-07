# Audit Keamanan dan Kualitas Kode OpenFolio AI

Tanggal audit: 2026-08-05  
Lokasi audit: `C:\Users\Miqdad\Documents\01. Proyek Pribadi\OpenFolio-AI`  
Auditor: Codex  

## Ringkasan Eksekutif

Project berhasil lulus typecheck dan build, tetapi belum aman untuk production tanpa perbaikan. Risiko terbesar ada pada build server yang ikut disajikan sebagai static file, endpoint API server yang tidak punya autentikasi/otorisasi, penggunaan iframe `srcDoc` yang lemah isolasinya, aturan Firestore yang tidak konsisten dengan fitur public portfolio, serta vulnerability dependency dari `npm audit`.

Prioritas perbaikan:

1. Pisahkan server bundle dari folder static `dist` dan jangan publish source map server.
2. Tambahkan autentikasi server-side untuk semua endpoint mahal/berisiko, terutama Gemini, upload, PDF parse, dan portfolio inject.
3. Isolasi HTML portfolio dengan iframe sandbox yang benar atau domain terpisah.
4. Perbaiki model/rules Firestore untuk public portfolio dan koleksi `users`.
5. Selesaikan dependency vulnerability, terutama `react-router-dom` dan dependency tidak terpakai `firebase-admin`.
6. Harden upload: validasi magic byte, route-specific file filter, rate limit, dan larang SVG bila tidak disanitasi.
7. Samakan nama env var Gemini dan gunakan `process.env.PORT` untuk production.

## Metode Audit

Perintah yang dijalankan:

```powershell
npm run lint
npm run build
npm audit --json
npm audit --omit=dev --json
npm list react-router-dom react-router firebase-admin @google-cloud/firestore uuid --depth=4
npm list vite @google/genai firebase express multer --depth=0
rg --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!dist/**' "(secret/key patterns)" .
```

Hasil verifikasi:

- `npm run lint`: lulus, menjalankan `tsc --noEmit`.
- `npm run build`: lulus, tetapi ada warning chunk client lebih dari 500 kB.
- `npm audit --omit=dev`: gagal dengan 10 vulnerability production, terdiri dari 2 high dan 8 moderate.
- Secret scan: tidak ditemukan server secret yang jelas. `firebase-applet-config.json` berisi Firebase Web API key; ini bukan secret server, tetapi harus diamankan lewat rules, App Check, dan restriction di Firebase/Google Cloud.

## Temuan Kritis

### 1. Server bundle dan source map berpotensi ter-publish ke browser

Severity: Critical  
Lokasi: `package.json:8`, `server.ts:1547-1550`, `dist/server.cjs`, `dist/server.cjs.map`

`package.json` membuild server ke `dist/server.cjs`:

```json
"build": "vite build && esbuild server.ts ... --sourcemap --outfile=dist/server.cjs"
```

Di production, server menyajikan seluruh folder `dist`:

```ts
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
```

Setelah build, folder `dist` berisi:

- `server.cjs`
- `server.cjs.map`
- `index.html`
- `assets/`

`dist/server.cjs.map` mengandung `sourcesContent`, sehingga source code server, prompt internal Gemini, struktur endpoint, dan detail implementasi dapat diunduh jika static route terbuka.

Dampak:

- Source code backend dan prompt internal bocor.
- Penyerang lebih mudah memetakan endpoint, batasan, dan fallback.
- Informasi internal dapat mempercepat eksploitasi bug lain.

Rekomendasi:

- Build client ke `dist/client`, server ke `dist-server/server.cjs` atau `build/server.cjs`.
- Sajikan hanya folder client static:

```ts
const clientDistPath = path.join(process.cwd(), "dist", "client");
app.use(express.static(clientDistPath));
```

- Matikan sourcemap server untuk production atau simpan di lokasi privat.
- Tambahkan deny-list defensif untuk `/server.cjs`, `/*.map`, dan file backend lain jika tetap memakai satu folder.

## Temuan High

### 2. Endpoint server berisiko abuse karena tidak ada autentikasi server-side

Severity: High  
Lokasi: `server.ts:128-139`, `server.ts:146`, `server.ts:166`, `server.ts:210`, `server.ts:359`, `server.ts:659`, `server.ts:1523`, `src/lib/UsageService.ts:63-125`

Server memakai `app.use(cors())` tanpa origin allowlist dan tidak memverifikasi Firebase token pada endpoint:

- `POST /api/pdf/parse`
- `POST /api/upload`
- `POST /api/gemini/chat`
- `POST /api/gemini/generate`
- `POST /api/gemini/edit`
- `POST /api/portfolio/inject`

Rate limit hanya dipasang ke `/api/gemini`, bukan upload, PDF parse, atau inject. Kuota di `UsageService` berjalan di client/localStorage dan bisa dilewati dengan request langsung ke API.

Dampak:

- API Gemini dan Cloudinary dapat dipakai pihak luar untuk menghabiskan quota/biaya.
- Upload dan PDF parse dapat dipakai untuk DoS ringan.
- CORS terbuka memperluas permukaan abuse dari origin manapun.

Rekomendasi:

- Tambahkan middleware auth:

```ts
const authHeader = req.header("authorization") || "";
const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
const decoded = await admin.auth().verifyIdToken(token);
req.user = decoded;
```

- Gunakan Firebase Admin hanya jika benar-benar dipakai untuk verifikasi token; saat ini dependency `firebase-admin` ada tapi tidak digunakan.
- Terapkan server-side quota berdasarkan `uid` dan IP.
- Batasi CORS ke origin aplikasi production.
- Untuk guest mode, pakai App Check, CAPTCHA, anonymous auth, atau signed short-lived session.

### 3. Iframe `srcDoc` tidak terisolasi dengan aman

Severity: High  
Lokasi: `src/pages/PublicPortfolioPage.tsx:70-74`, `src/pages/CanvasPage.tsx:1932-1938`, `src/pages/CanvasPage.tsx:2135-2141`

Public portfolio merender HTML tersimpan langsung ke iframe:

```tsx
<iframe srcDoc={htmlContent} />
```

Canvas preview memakai:

```tsx
sandbox="allow-scripts allow-same-origin"
```

Kombinasi `allow-scripts` dan `allow-same-origin` melemahkan isolasi karena dokumen iframe tetap berada pada origin aplikasi. Jika `htmlContent` dapat dimanipulasi, ini berpotensi menjadi XSS same-origin.

Dampak:

- Script di HTML portfolio dapat mengakses origin aplikasi jika tidak diisolasi.
- Risiko pencurian localStorage/session state meningkat.
- Risiko meningkat jika rules public portfolio nanti dibuka.

Rekomendasi:

- Untuk preview, hindari `allow-same-origin` jika tidak wajib:

```tsx
sandbox="allow-scripts"
```

- Untuk public portfolio, gunakan sandbox minimal atau host portfolio di origin terpisah, misalnya `portfolio.openfolio.dev`.
- Tambahkan CSP ketat untuk halaman parent.
- Simpan/render hanya HTML yang dihasilkan sanitizer server, bukan HTML arbitrary dari user.

### 4. Firestore rules tidak sesuai dengan fitur public portfolio dan koleksi `users`

Severity: High  
Lokasi: `firestore.rules:4-10`, `src/pages/PublicPortfolioPage.tsx:17-23`, `src/components/SmartOnboarding.tsx:39-75`

Rules saat ini:

```js
match /portfolios/{docId} {
  allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
}
match /usage/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

Masalah:

- `/p/:id` mencoba membaca portfolio yang `isPublished`, tetapi rules hanya mengizinkan owner yang login.
- `SmartOnboarding` membaca/menulis `users/{uid}`, tetapi rules tidak punya match untuk `users`.
- Jika rules dibuka langsung untuk public read pada `portfolios`, semua field dokumen ikut berpotensi terbaca, termasuk `messages` dan `content`, bukan hanya HTML public.

Dampak:

- Halaman public portfolio dapat gagal untuk visitor anonim.
- Onboarding status Firestore dapat gagal dengan permission denied.
- Perbaikan rules yang terlalu luas dapat membocorkan data private.

Rekomendasi:

- Pisahkan dokumen publik ke koleksi khusus, misalnya `publicPortfolios/{id}`, berisi hanya field yang aman dipublikasi.
- Tambahkan rules `users/{userId}`:

```js
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

- Jangan public-read koleksi `portfolios` utama yang berisi chat history dan data mentah.

### 5. Dependency production memiliki vulnerability high dan moderate

Severity: High  
Lokasi: `package.json:22-33`, `package-lock.json`

`npm audit --omit=dev` melaporkan:

- Total: 10 vulnerabilities
- High: 2
- Moderate: 8

Versi aktual dari lockfile:

- `react-router-dom@7.18.2`
- `react-router@7.18.2`
- `firebase-admin@13.10.0`
- `@google-cloud/firestore@7.11.6`
- `uuid@9.0.1` transitif

Advisory high:

- `react-router`: React Router RSC Mode CSRF bypass, `GHSA-qwww-vcr4-c8h2`

Moderate mayoritas berasal dari `firebase-admin` transitif:

- `@google-cloud/firestore`
- `@google-cloud/storage`
- `google-gax`
- `gaxios`
- `retry-request`
- `teeny-request`
- `uuid`

Catatan penting: `firebase-admin` tidak terlihat digunakan di source runtime saat ini. Dependency ini justru membawa sebagian besar vulnerability transitif.

Rekomendasi:

- Jika belum butuh Firebase Admin, hapus dependency `firebase-admin`.
- Jika butuh untuk auth middleware, upgrade dan test ke versi yang direkomendasikan audit.
- Evaluasi advisory React Router. Aplikasi ini tidak terlihat memakai RSC mode, jadi exploitability mungkin lebih rendah, tetapi package vulnerable tetap ada.
- Jalankan lagi `npm audit --omit=dev` setelah update.

## Temuan Medium

### 6. Upload file terlalu longgar dan memakai satu middleware untuk PDF serta image

Severity: Medium  
Lokasi: `server.ts:111-122`, `server.ts:146-163`, `server.ts:166-207`, `src/pages/CanvasPage.tsx:1251-1267`, `src/pages/CanvasPage.tsx:1393-1415`

`multer` mengizinkan:

```ts
['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
```

Masalah:

- `file.mimetype` berasal dari client dan mudah dipalsukan.
- Route `/api/upload` bisa menerima PDF karena memakai middleware yang sama.
- Route `/api/pdf/parse` bisa menerima image/SVG lalu parser PDF akan error.
- SVG dapat membawa risiko active content jika disajikan atau dibuka dalam konteks tertentu.
- Client membatasi image 2 MB, tetapi server menerima 10 MB untuk direct request.
- Endpoint upload tidak punya rate limit.

Rekomendasi:

- Buat middleware terpisah: `uploadPdf` hanya PDF, `uploadImage` hanya JPEG/PNG/WebP.
- Validasi magic byte memakai library seperti `file-type`.
- Larang SVG kecuali benar-benar disanitasi.
- Tambahkan rate limit untuk upload/PDF parse.
- Samakan batas server dengan batas client.

### 7. Fallback upload ke Data URI dapat menyebabkan bloat, quota error, dan data leak

Severity: Medium  
Lokasi: `server.ts:175-180`, `src/pages/CanvasPage.tsx:616-621`, `src/pages/CanvasPage.tsx:1027`, `src/pages/CanvasPage.tsx:1172`

Jika Cloudinary API key tidak ada, server mengembalikan file sebagai base64 Data URI:

```ts
finalUrl = "data:" + req.file.mimetype + ";base64," + b64;
```

Dampak:

- File 10 MB menjadi sekitar 13 MB Data URI.
- Mudah melampaui batas Firestore/localStorage.
- HTML portfolio menjadi sangat besar.
- Data image/PDF tertanam langsung di dokumen dan export.

Rekomendasi:

- Di production, fail fast jika Cloudinary belum dikonfigurasi.
- Jangan return Data URI untuk file besar.
- Tolak PDF di route image upload.
- Simpan asset di storage/CDN dan hanya simpan URL.

### 8. Error message internal dikirim langsung ke client

Severity: Medium  
Lokasi: `server.ts:155-158`, `server.ts:194-198`, `server.ts:1528-1530`, `server.ts:1534-1536`

Beberapa route mengirim `e.message` ke client:

```ts
res.status(500).json({ error: e.message });
```

Dampak:

- Pesan internal dari parser, Cloudinary, atau runtime dapat bocor.
- Memudahkan penyerang memahami dependency dan kondisi server.

Rekomendasi:

- Log error detail di server.
- Return generic error ke client, misalnya `"Gagal memproses file"`.
- Beri correlation id untuk debugging.

### 9. URL sanitizer masih mengizinkan `data:` dan terlalu permisif

Severity: Medium  
Lokasi: `server.ts:901-905`, `server.ts:913`, `server.ts:932-933`, `server.ts:1072-1078`, `server.ts:1177-1200`, `server.ts:1341-1343`

Sanitizer mengizinkan URL yang dimulai dengan:

```ts
http://, https://, mailto:, data:
```

`data:` kemudian dipakai untuk `href` dan `img src`. Ini terlalu longgar untuk social/project link.

Dampak:

- Link `data:text/html,...` atau variasi URL tidak diinginkan bisa muncul di portfolio.
- `mailto:` boleh untuk email, tetapi tidak semestinya valid untuk image.
- `data:` semestinya hanya untuk image placeholder internal, bukan input user umum.

Rekomendasi:

- Gunakan `new URL()` dan protocol allowlist per konteks.
- Untuk external link: hanya `https:`.
- Untuk email: bangun `mailto:` dari email yang divalidasi.
- Untuk image: hanya `https:` atau Cloudinary URL yang valid; hindari Data URI user.

### 10. Tidak ada security headers/CSP

Severity: Medium  
Lokasi: `server.ts:124-130`, `server.ts:1430-1517`

Server belum memakai `helmet` atau header keamanan seperti CSP, `X-Content-Type-Options`, `Referrer-Policy`, dan `frame-ancestors`.

Generated portfolio juga memuat script CDN:

```html
<script src="https://cdn.tailwindcss.com"></script>
```

Dampak:

- Risiko XSS/supply-chain lebih sulit dibatasi.
- Generated HTML bergantung pada external script runtime.
- Browser hardening minim.

Rekomendasi:

- Tambahkan `helmet`.
- Definisikan CSP untuk app parent.
- Untuk HTML portfolio, pertimbangkan build CSS statis, bukan Tailwind CDN runtime.
- Serve portfolio pada origin berbeda jika perlu script di portfolio.

### 11. Endpoint AI dan inject tidak punya validasi schema input yang ketat

Severity: Medium  
Lokasi: `server.ts:210-216`, `server.ts:359-365`, `server.ts:659-665`, `server.ts:1523-1527`

Contoh:

```ts
const { messages } = req.body;
const history = messages.map(...)
```

Jika `messages` tidak ada atau bukan array, endpoint crash ke 500. Endpoint generate/edit/inject juga menerima object bebas, lalu melakukan `JSON.stringify`, render HTML, atau memanggil model.

Dampak:

- Request malformed menjadi 500, bukan 400.
- Data besar/aneh bisa membebani CPU/memory.
- Output model lebih sulit dijaga konsisten.

Rekomendasi:

- Gunakan schema validator seperti `zod`.
- Batasi jumlah message, panjang string, jumlah project/skill/career.
- Return 400 untuk request invalid.

### 12. Operasi sync/blocking dapat membebani event loop

Severity: Medium  
Lokasi: `server.ts:151-153`, `server.ts:177-179`, `server.ts:365`, `server.ts:665`

Server memakai `fs.readFileSync`, `fs.renameSync`, `fs.unlinkSync`, dan JSON clone besar di request path.

Dampak:

- Request file besar dapat memblokir event loop.
- Banyak request paralel dapat membuat API terasa hang.

Rekomendasi:

- Gunakan operasi async `fs.promises`.
- Streaming atau batasi ukuran lebih kecil.
- Tambahkan timeout dan concurrency limit pada operasi mahal.

## Temuan Reliability/Bug

### 13. Nama environment variable Gemini tidak konsisten

Severity: High untuk availability  
Lokasi: `server.ts:34`, `.env.example:1-4`, `README.md:18`, `list_models.ts:4`, beberapa `test_*.ts`

Server memakai:

```ts
const API_KEY = process.env.GEMINI_API_KEY_NEW;
```

Tetapi `.env.example` dan README menginstruksikan:

```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"
```

Dampak:

- Developer yang mengikuti README akan menjalankan app tanpa API key yang dibaca server.
- Fitur AI gagal runtime walaupun env sudah diisi.

Rekomendasi:

- Standarkan ke satu nama, idealnya `GEMINI_API_KEY`.
- Jika perlu migrasi, dukung fallback:

```ts
const API_KEY = process.env.GEMINI_API_KEY_NEW || process.env.GEMINI_API_KEY;
if (!API_KEY) throw new Error("Missing GEMINI_API_KEY");
```

### 14. Port server hardcoded ke 3001

Severity: High untuk deployment  
Lokasi: `server.ts:126`, `server.ts:1554`

Server memakai:

```ts
const PORT = 3001;
app.listen(PORT, "0.0.0.0", ...)
```

Dampak:

- Platform seperti Cloud Run/Render/Fly/Heroku biasanya mengharuskan app listen pada `process.env.PORT`.
- Deployment bisa dianggap tidak sehat walaupun server berjalan di port lain.

Rekomendasi:

```ts
const PORT = Number(process.env.PORT || 3001);
```

### 15. `setDoc` tanpa merge dapat me-reset field dan status pin

Severity: Medium  
Lokasi: `src/pages/CanvasPage.tsx:744-751`, `src/pages/CanvasPage.tsx:1008-1017`, `src/pages/CanvasPage.tsx:1154-1163`

Saat direct update, generate, dan edit, code memakai `setDoc` dengan `pinned: false`.

Dampak:

- Project yang sebelumnya dipin dapat kembali `false` setelah edit.
- Field lain yang tidak ditulis ulang dapat hilang karena `setDoc` default replace.

Rekomendasi:

- Gunakan `setDoc(docRef, data, { merge: true })` atau `updateDoc`.
- Preserve `createdAt`, `pinned`, dan metadata lain.

### 16. Chat history hasil generate tidak menyimpan pesan sukses terakhir

Severity: Low/Medium  
Lokasi: `src/pages/CanvasPage.tsx:1008-1014`, `src/pages/CanvasPage.tsx:1047-1060`

Data disimpan dengan:

```ts
messages: workspaceMessages
```

Setelah itu state diubah menjadi pesan sukses assistant. Akibatnya reload dari Firestore/localStorage bisa kehilangan pesan sukses terakhir.

Rekomendasi:

- Buat `finalMessages` dulu, simpan dan set state dari array yang sama.

### 17. CV upload UI tidak memakai endpoint PDF parser

Severity: Low/Medium  
Lokasi: `src/pages/CanvasPage.tsx:1251-1255`, `server.ts:146-163`

Input CV hanya menyimpan nama file:

```tsx
setUploadedCvName(e.target.files[0].name)
```

Tidak ada call ke `/api/pdf/parse` dari client. Endpoint PDF parse tetap terbuka di server.

Dampak:

- Fitur CV parsing tampak belum selesai.
- Endpoint attack surface tetap ada walau tidak dipakai UI.

Rekomendasi:

- Implementasikan parsing CV dengan validasi auth/rate limit, atau hapus endpoint sampai fitur siap.

### 18. `callInjectAPI` menyembunyikan kegagalan render

Severity: Low/Medium  
Lokasi: `src/pages/CanvasPage.tsx:849-862`

Jika inject API gagal, fungsi mengembalikan:

```html
<html><body>Gagal render.</body></html>
```

Dampak:

- UI/persistence bisa menyimpan HTML fallback sebagai portfolio.
- Error sebenarnya menjadi sulit dilacak.

Rekomendasi:

- Lempar error ke caller.
- Jangan persist HTML fallback kecuali user memilih retry/fallback secara eksplisit.

## Temuan Kualitas Kode

### 19. TypeScript belum strict dan banyak `any`

Severity: Medium  
Lokasi: `tsconfig.json:12-16`, `server.ts`, `src/pages/CanvasPage.tsx`

`tsconfig.json` belum mengaktifkan `strict`, masih `allowJs: true`, dan `skipLibCheck: true`.

Dampak:

- Banyak bug runtime tidak tertangkap saat typecheck.
- Contract data portfolio, API request, dan response AI mudah drift.

Rekomendasi:

- Aktifkan bertahap:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "noUncheckedIndexedAccess": true
}
```

- Mulai dari shared schema untuk `PortfolioData`, request API, dan response API.

### 20. Script root bersifat one-off dan bisa merusak file bila dijalankan tidak sengaja

Severity: Low/Medium  
Lokasi: `replace.cjs`, `replace_canvas.cjs`, `replace_canvas_3xl.cjs`, `replace_indo.cjs`, `replace_settings_color.cjs`

Script tersebut melakukan replace massal langsung ke source file tanpa backup, dry-run, atau test. Script tidak ada di `package.json`, tetapi tetap berada di root repo.

Rekomendasi:

- Pindahkan ke `scripts/archive/` atau hapus jika sudah tidak dipakai.
- Jika masih dipakai, tambahkan CLI arg, dry-run, dan test.

### 21. `clean` script tidak portable untuk Windows

Severity: Low  
Lokasi: `package.json:10`

Script:

```json
"clean": "rm -rf dist server.js"
```

Dampak:

- Gagal di default Windows shell tanpa Unix utilities.

Rekomendasi:

- Gunakan package cross-platform seperti `rimraf`, atau script Node kecil.

### 22. Unused import/dependency dan dead code

Severity: Low  
Lokasi contoh: `server.ts:9`, `server.ts:1100`, `src/pages/CanvasPage.tsx:10`, `src/pages/CanvasPage.tsx:17`, `src/pages/SettingsPage.tsx:131`, `src/components/AppLayout.tsx:6`

Contoh:

- `mustache` diimport tetapi tidak dipakai.
- `firebase-admin` dependency ada tetapi tidak dipakai.
- `TEMPLATES`, `uploadedPhotoUrl`, sebagian import Firestore tidak dipakai.
- `logoHtml` dibuat tetapi tidak dipakai.

Rekomendasi:

- Tambahkan ESLint dengan rule `no-unused-vars`.
- Hapus dependency/import yang tidak digunakan.

### 23. File test/manual script tidak konsisten dan sebagian berisi mojibake

Severity: Low  
Lokasi: `test_*.ts`, `test_sim.mjs`, `list_models.ts`

Beberapa file test memakai `GEMINI_API_KEY`, sebagian memakai `GEMINI_API_KEY_NEW`. Ada text mojibake di `test_edit.ts`. Script manual ini tidak terhubung ke test runner.

Rekomendasi:

- Pindahkan ke `tests/manual/`.
- Standarkan env var.
- Tambahkan test runner atau hapus file eksperimen lama.

## Catatan Positif

- `.gitignore` sudah meng-ignore `.env*` dan tetap membolehkan `.env.example`.
- Tidak ditemukan private key/server secret nyata di file source, selain Firebase Web API key yang memang public config.
- Temporary upload sudah memakai `os.tmpdir()` dan cleanup `finally`, lebih baik daripada hardcoded `/tmp`.
- `react-markdown` dipakai tanpa plugin raw HTML, sehingga markdown message tidak langsung merender HTML raw.
- Build dan typecheck lulus.

## Rencana Perbaikan Bertahap

### Sprint 1: Blocking Security

1. Ubah struktur build agar server bundle tidak berada di static directory.
2. Hapus server sourcemap production.
3. Tambahkan auth middleware dan server-side quota.
4. Restrict CORS.
5. Sandbox iframe dengan benar atau pindahkan portfolio ke domain terpisah.

### Sprint 2: Data dan Upload

1. Desain ulang Firestore rules untuk private/public split.
2. Tambahkan rules `users/{uid}`.
3. Harden upload dengan magic-byte validation.
4. Hapus fallback Data URI untuk production.
5. Tambahkan rate limit ke upload, PDF parse, dan inject.

### Sprint 3: Reliability dan Quality

1. Standarkan `GEMINI_API_KEY`.
2. Gunakan `process.env.PORT`.
3. Resolve `npm audit`.
4. Aktifkan ESLint dan TypeScript strict secara bertahap.
5. Rapikan script root dan file test manual.

## Status Akhir Audit

Status production readiness: Belum siap production.

Alasan utama:

- Source server berpotensi ter-serve sebagai static file.
- Endpoint backend mahal belum punya auth server-side.
- Public HTML rendering belum diisolasi aman.
- Rules Firestore belum sesuai fitur.
- Dependency audit masih merah.

Build status: Lulus.  
Typecheck status: Lulus.  
Dependency audit: Gagal, 10 vulnerability production.  
Secret scan: Tidak ada server secret nyata yang ditemukan di source.
