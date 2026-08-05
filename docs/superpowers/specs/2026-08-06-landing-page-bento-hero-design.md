# Landing Page OpenFolio — Redesign "Bento Hero"

Tanggal: 2026-08-06
Status: Disetujui (design review)
Lingkup: UI-only — mengganti `src/pages/LandingPage.tsx`. Tidak mengubah logika, routing, atau behavior app.

## Ringkasan

Landing page OpenFolio diredesign dari gaya editorial minimal menjadi **dark-premium "bento hero"**: grid bento asimetris sebagai layar pertama, dengan headline + CTA + visual + statistik dalam satu grid. Mengambil semangat visual dari landing DiagramPilot (referensi user) sebagai *preferensi*, bukan salinan — dikembangkan dengan identitas metalik OpenFolio sendiri.

Bahasa copy: **Indonesia** (konsisten dengan UI app).

## Tujuan

- Landing page yang menarik, premium, dan meyakinkan untuk produk AI portfolio builder.
- Menyampaikan value proposition inti dalam satu pandang: **gratis, tanpa login, hasil langsung, publish ke URL publik**.
- Menampilkan struktur produk (bento) sebagai identitas visual — "produknya sendiri adalah grid".

## Arah Desain — Konsep B (Bento sebagai Hero)

| Aspek | Keputusan |
|---|---|
| Layout utama | Bento grid asimetris di layar pertama; headline hidup di dalam grid |
| Tema | Dark premium (zinc/black) |
| Aksen | Gradient metalik OpenFolio (titanium `#FFFFFF` → platinum `#D4D4D8` → graphite `#71717A`) untuk highlight/ikon penting |
| Bahasa | Indonesia |
| CTA utama | Semua tombol aksi → `/app` (guest-only; tidak ada login) |

## Identitas Visual

- **Warna**: background `#0a0a0f`–`#000000`; teks zinc (`#a1a1aa`–`#e4e4e7`); kartu `#131318`–`#16161d` dengan border `white/5`–`white/10`; CTA putih (`#fff` bg, `#000` text).
- **Gradient metalik**: dipakai di text highlight (mis. kata kunci headline), glow ambient atas, dan detail ikon — diambil dari `Logo.tsx` `#openfolio-logo-gradient`.
- **Tipografi**: headline bold tracking-tight (font sans); subtext `font-light` zinc-400; label/badge `uppercase tracking-wider` kecil.
- **Glow/ambience**: radial gradient halus di atas hero, blur, `pointer-events-none` (seperti referensi).

## Struktur Halaman (section by section)

### 1. Navbar (fixed, `backdrop-blur`)
- Kiri: `Logo` (komponen `Logo`, ukuran kecil) + teks "OpenFolio".
- Kanan: link GitHub (ikon) + tombol CTA **Deploy** (putih) → `/app`.

### 2. Bento Hero (layar pertama, ~100vh)
Grid 12 kolom, gap konsisten, kartu `rounded-xl` border tipis:
- **Card A — Headline (span 7, tinggi besar)**: badge pill ("AI Portfolio Builder · Gratis", dot animate) → headline **"Portofolio-mu, dikodekan AI."** (dua baris, kata "dikodekan" bisa pakai gradient metalik) → subtext ("Tempel data → AI susun → pilih template → publish URL publik. Tanpa login.") → CTA putih **"Mulai Membuat Gratis →"**.
- **Card B — Visual preview (span 5)**: mock kartu portfolio yang dibangun dari markup CSS (avatar, nama, bar skill, dll.), bukan screenshot; hover subtle.
- **Card C (span 4)**: angka besar **8** + "Template siap pakai".
- **Card D (span 4)**: monospace **/p/nama** + "Publish ke URL publik".
- **Card E (span 4)**: **Tanpa login** + "Guest-only · Quota harian".

### 3. Cara Kerja — 4 langkah (grid 4 kolom)
1. **Tempel data** — resume / jawab singkat
2. **AI menyusun** — identitas + konten
3. **Pilih template** — 8 gaya berbeda
4. **Publish** — URL publik `/p/...`

### 4. Kenapa OpenFolio — tabel perbandingan
Tabel 2 kolom: **OpenFolio** (✓) vs **Manual / jasa** (✗), baris: kecepatan (detik vs jam), tanpa login (ya vs wajib akun), template (8 siap pakai vs dari nol), hasil (HTML/Tailwind bersih vs bergantung), revisi (chat AI vs manual), biaya (gratis vs mahal).

### 5. Template — strip 8 kartu
Grid 4×2: `obsidian`, `kinetic`, `aurora`, `folio`, `studio`, `nexus`, `pulse`, `manuscript` — tiap kartu: nama template + mini-swash visual.

### 6. CTA Open Source
Panel besar (grid background halus + radial glow): headline **"Gratis. Open source. Tanpa login."** → subtext (MIT License · Host sendiri · Kontribusi terbuka) → tombol **"Mulai Membuat →"** (putih) + tombol sekunder **GitHub** (border).

### 7. Footer (minimal)
Kiri: "OpenFolio © 2026". Kanan: link **GitHub** (repo `MiqdadBadjuber/OpenFolio-AI`) + **Dokumentasi**.

## Spesifikasi Teknis

- File yang diubah: `src/pages/LandingPage.tsx` (rewrite UI). Tidak ada file lain.
- Stack: React + Vite + **Tailwind v4** (`@tailwindcss/vite`), ikon `lucide-react`, animasi opsional `motion/react`.
- Reuse: komponen `Logo` (variant `white` / `gradient`).
- Routing: `Link` dari `react-router` (`to="/app"`), `a href` GitHub.
- Semua tombol aksi utama → `/app` (guest-only, tanpa login).
- Tailwind arbitrary values untuk warna khusus (pola `bg-[#...]` seperti halaman existing).
- Tidak ada asset gambar baru dibutuhkan (visual hero dibangun markup, bukan screenshot).

## Responsivitas

- Bento hero: `grid-cols-1` di mobile → `grid-cols-12` di `md+`; card headline/visual stack.
- Cara kerja & template: `grid-cols-1` → `md:grid-cols-4` / `md:grid-cols-2`.
- Navbar: CTA tetap terlihat; link GitHub hidden di mobile (ikon saja).
- `overflow-x-hidden` pada wrapper.

## Batasan / Non-goals

- **TIDAK** mengubah logika app, routing, auth, quota, atau endpoint.
- **TIDAK** menambah section interaktif berat (mis. form di landing) — landing statis + CTA ke `/app`.
- **TIDAK** mengubah halaman lain.
- Tidak menambah dependency baru.

## Definisi Selesai

- `npm run lint` (tsc strict) pass — LandingPage.tsx strict-clean.
- `npm run build` pass.
- Tampil benar di mobile & desktop (smoke test manual).
- Tombol CTA navigasi ke `/app`; link GitHub & footer benar.
- Tidak ada regresi visual/style lain.
