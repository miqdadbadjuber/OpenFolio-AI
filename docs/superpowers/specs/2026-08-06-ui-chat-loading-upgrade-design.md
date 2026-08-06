# Rancangan Desain — Upgrade UI: Loading Generate & Chat AI

**Tanggal:** 2026-08-06
**Status:** Menunggu persetujuan user
**Ruang lingkup:** UI saja — tidak ada perubahan logika AI, API, atau server.

---

## Ringkasan

Dua tampilan di-upgrade supaya nggak terasa "AI slop" dan nggak membosankan:

1. **Panel langkah pas loading generate** — dari kapsul + status kata-kata
   ("Active/Pending/Done") jadi daftar minimalis dengan **ikon per langkah**,
   nama langkah **Bahasa Indonesia**, dan perbaikan angka **95%** yang tadinya
   terasa nge-lag.
2. **Chat AI** — hilangkan **bubble**, pesan AI ditandai **logo putih transparan**
   saja (tanpa teks "OpenFolio"), pesan AI terakhir **ketik demi ketik**
   (typewriter), dan indikator "sedang mengetik" diganti dari **3 titik
   naik-turun** jadi gaya berpikir yang lebih halus.

---

## Bagian A — Loading Generate

### Lokasi
`src/pages/CanvasPage.tsx`, blok `guidedStage === 'generating'` (kolom kiri).

### Desain baru (kolom kiri)
Daftar 5 langkah, gaya **"Ikon Langkah"** yang sudah disepakati di visual
companion (dipilih user dari 3 opsi tanpa nomor):

| Langkah | Nama (baru) | Ikon lucide |
|---------|-------------|-------------|
| 1 | Analisis Identitas | `Fingerprint` |
| 2 | Arsitektur Portofolio | `Layers` |
| 3 | Komposisi Visual | `PenTool` |
| 4 | Penyusunan Konten | `FileText` |
| 5 | Render Final | `Monitor` |

Aturan tampil:
- **Tanpa kotak/kapsul** — tiap baris polos: ikon + nama langkah.
- **Tanpa status kata-kata** ("Active/Pending/Done") — status dibaca dari warna:
  - Selesai → ikon redup (zinc-400) + tanda **✓ hijau** di ujung kanan baris.
  - Berjalan → ikon **biru** + titik biru kecil di ujung kanan (denyut halus, bukan naik-turun).
  - Belum → ikon & teks **redup** (zinc-600).
- **Nama langkah Bahasa Indonesia** (tabel di atas) biar nggak terasa template AI.
- Heading tetap "Merakit Portofolio…" + deskripsi singkat di bawahnya.

### Perbaikan "95% nge-lag"
Saat bar kemajuan menyentuh 95% tapi AI masih kerja, angka persen
**disembunyikan** dan diganti:
- Teks **"Menyiapkan hasil akhir…"**
- Garis tipis di bawahnya **berdenyut halus** (indeterminate, bergeser pelan
  maju-mundur) supaya jelas masih proses, bukan hang.

Persen muncul kembali saat selesai (100%).

### Kolom kanan
Mockup MacBook + skeleton shimmer **tetap** — user suka konsepnya, tidak diubah.

---

## Bagian B — Chat AI

### Lokasi
`src/pages/CanvasPage.tsx`, area chat (render `workspaceMessages`) di halaman
`guidedStage === 'done'`.

### Desain baru
- **Hilangkan bubble** — pesan tampil sebagai teks polos, tanpa background/border.
- **Pesan AI** (kiri): **logo putih transparan** di atas teks — **tanpa** label
  teks "OpenFolio". Logo dari komponen yang sudah ada: `<Logo variant="white" />`.
- **Pesan user** (kanan): teks putih, rata kanan, tanpa label "Anda" — pembeda
  cukup dari posisi kiri/kanan (senada dengan keputusan "cukup logo aja").
- **Animasi teks (typewriter)**: pesan AI **terakhir** muncul karakter per
  karakter (~15ms/karakter) dengan kursor `▍`, pola dari referensi DiagramPilot
  (`TypewriterMarkdown.tsx`). Pesan lama langsung tampil penuh.
- **Indikator mengetik baru**: logo putih + teks **"Sedang memikirkan…"** + 3
  titik yang **muncul bergantian dengan transisi opacity halus** (bukan
  `animate-bounce` naik-turun yang membosankan).

### Catatan implementasi typewriter
- Komponen baru `TypewriterMarkdown` (adaptasi dari DiagramPilot, dipakai
  bersama `react-markdown` yang sudah ada di project).
- `shouldAnimate` bernilai `true` **hanya** untuk pesan AI terakhir; pesan
  sebelumnya render penuh tanpa animasi.
- Potongan teks progresif tetap dirender lewat `<Markdown>` yang sama, jadi
  markdown (list, kode, dll.) tetap tampil benar.

---

## Komponen / File yang Berubah

| File | Perubahan |
|------|-----------|
| `src/pages/CanvasPage.tsx` | Panel langkah generate (Bagian A) + fix 95% + chat tanpa bubble + logo putih + typewriter + indikator mengetik baru (Bagian B) |
| `src/components/TypewriterMarkdown.tsx` | **Baru** — komponen typewriter (adaptasi dari DiagramPilot) |
| Dokumen ini | `docs/superpowers/specs/2026-08-06-ui-chat-loading-upgrade-design.md` |

Tidak ada perubahan di `server/`, `api/`, atau config.

## Verifikasi
- `npm run lint`, `tsc`, `vite build`, dan build server tetap lolos.
- Generate: langkah berjalan (ikon berubah status), di 95% muncul
  "Menyiapkan hasil akhir…" + garis berdenyut, selesai di 100%.
- Chat: pesan AI ketik demi ketik dengan kursor, logo putih tampil di pesan AI,
  indikator "Sedang memikirkan…" halus, tanpa bubble sama sekali.
