# UI Chat & Loading Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade dua tampilan: panel langkah pas loading generate jadi daftar minimalis berikon (Bahasa Indonesia, tanpa "95% nge-lag"), dan chat AI jadi tanpa bubble dengan logo putih + animasi ketik (typewriter) + indikator "Sedang memikirkan" yang halus.

**Architecture:** Semua perubahan ada di sisi frontend. `src/components/TypingText.tsx` (komponen yang sudah ada) ditambah dukungan kursor `▍`; `src/pages/CanvasPage.tsx` diubah di dua area: blok `guidedStage === 'generating'` (panel langkah + progress) dan blok `guidedStage === 'done'` (render chat). Tidak ada perubahan server/API. Logo putih transparan memakai komponen `Logo variant="white"` yang sudah ada.

**Tech Stack:** React 19, TypeScript, Tailwind v4, motion (framer-motion), react-markdown, lucide-react.

## Global Constraints

- Semua teks UI baru dalam **Bahasa Indonesia** (nama langkah: Analisis Identitas, Arsitektur Portofolio, Komposisi Visual, Penyusunan Konten, Render Final).
- **Jangan pernah membaca/mengubah file `.env`** (isi secret). Debug hanya lewat `dotenv.config()` saat runtime.
- **Jangan** mengubah logika AI, route `/api/gemini/*`, atau `server/`. UI only.
- Ikon pakai `lucide-react` (sudah jadi dependency).
- **Komponen typewriter memakai `src/components/TypingText.tsx` yang sudah ada** (ditambah prop `showCursor`), BUKAN membuat file `TypewriterMarkdown.tsx` baru seperti yang disebut di spec — fungsinya nyaris identik, dan ini DRY. Hasil visual tetap sama dengan spec.
- Verifikasi tiap task: `npm run lint` (tsc `--noEmit`) dan `npm run build` (vite build) harus lolos. Build server (`npm run build:server`) tidak terpengaruh tapi tetap cek bila sempat.
- Proyek ini **tidak punya infra test komponen** (vitest hanya untuk `server/**` dan `src/lib/**` dengan environment `node`). Verifikasi visual manual tetap langkah wajib.
- Commit tiap task selesai. Jangan push kecuali diminta user.

---

### Task 1: `TypingText` — tambah kursor `▍` saat mengetik

**Files:**
- Modify: `src/components/TypingText.tsx`

**Interfaces:**
- Consumes: — (komponen berdiri sendiri)
- Produces: prop baru `showCursor?: boolean` pada `TypingTextProps`. Saat `showCursor` dan masih mengetik, teks yang dirender diakhiri ` ▍`. Task 2 memakai prop ini.

- [ ] **Step 1: Baca `src/components/TypingText.tsx`**

Baca file ini dulu untuk memastikan struktur terkini sebelum diedit.

- [ ] **Step 2: Tambah prop `showCursor` dan render kursor**

Ubah `TypingTextProps` dan logika render:

```tsx
interface TypingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  skip?: boolean;
  className?: string;
  showCursor?: boolean;
}

export const TypingText: React.FC<TypingTextProps> = ({ text, speed = 15, onComplete, skip = false, className, showCursor = false }) => {
```

Di dalam komponen, ganti baris `return` (dua blok: satu untuk `skip` di awal, satu untuk render normal di akhir) agar menambahkan kursor saat mengetik. Untuk blok render normal di akhir file:

```tsx
  const isTyping = currentIndex < text.length;
  const displayed = showCursor && isTyping ? `${displayedText} ▍` : displayedText;

  return (
    <div className={`markdown-body prose prose-invert max-w-none text-sm prose-p:leading-relaxed ${className || ''}`}>
      <Markdown>{displayed}</Markdown>
    </div>
  );
```

> Catatan: variabel `displayedText` yang sudah ada di `useState` tetap dipakai; `displayed` hanya menambahkan kursor di akhir. `isTyping` dihitung dari `currentIndex`. Blok render di cabang `skip` tetap seperti semula (`displayedText` langsung).

- [ ] **Step 3: Verifikasi lint**

Run: `npm run lint`
Expected: lolos tanpa error tipe.

- [ ] **Step 4: Commit**

```bash
git add src/components/TypingText.tsx
git commit -m "feat: add showCursor option to TypingText"
```

---

### Task 2: Chat AI — tanpa bubble, logo putih, typewriter, indikator "Sedang memikirkan"

**Files:**
- Modify: `src/pages/CanvasPage.tsx` (import lucide tidak berubah di task ini; `Logo` dan `TypingText` sudah di-import)
- Modify: `src/pages/CanvasPage.tsx:270` (deklarasi state `workspaceMessages` — tambahkan state baru di dekatnya)
- Modify: `src/pages/CanvasPage.tsx:1015-1028` (generatePortfolio: set `lastTypedContent`)
- Modify: `src/pages/CanvasPage.tsx:1155-1164` (handleSendRevision sukses: set `lastTypedContent`)
- Modify: `src/pages/CanvasPage.tsx:2035-2083` (render pesan chat + indikator mengetik)

**Interfaces:**
- Consumes: `TypingText` dengan prop `showCursor` (dari Task 1); `Logo` dengan `variant="white"` (sudah ada).
- Produces: state `lastTypedContent: string | null` (isi pesan AI terakhir yang baru digenerate — dipakai menentukan pesan mana yang animasi). Helper `scrollChatToBottom`.

- [ ] **Step 1: Tambah state `lastTypedContent` dan ref scroll**

Di dekat deklarasi `workspaceMessages` (sekitar baris 270):

```tsx
const [workspaceMessages, setWorkspaceMessages] = useState<Array<{ role: string; content: string }>>([]);
// Pesan AI terakhir yang baru dibuat (untuk animasi ketik). Null = tidak ada yang animasi (mis. hasil restore).
const [lastTypedContent, setLastTypedContent] = useState<string | null>(null);
const chatScrollRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 2: Definisikan `scrollChatToBottom`**

Di dalam komponen (di dekat fungsi lain, mis. setelah deklarasi `handleSendRevision`):

```tsx
const scrollChatToBottom = () => {
  chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
};
```

Tambahkan effect supaya chat auto-scroll saat daftar pesan atau status editing berubah:

```tsx
useEffect(() => {
  scrollChatToBottom();
}, [workspaceMessages, isEditingPortfolio]);
```

- [ ] **Step 3: Set `lastTypedContent` di alur generate**

Di `generatePortfolio`, tepat setelah array `finalMessages` selesai dibangun (setelah baris `];` yang menutup array, sebelum `setPortfolioData`), tambahkan:

```tsx
setLastTypedContent(finalMessages[finalMessages.length - 1].content);
```

- [ ] **Step 4: Set `lastTypedContent` di alur edit sukses**

Di `handleSendRevision`, tepat sebelum `setWorkspaceMessages(finalMessages)` (sekitar baris 1164):

```tsx
setLastTypedContent(responseData.explanation || "Perubahan visual berhasil diterapkan ke dalam struktur portal.");
```

> Jalur error (catch) TIDAK menyentuh `lastTypedContent`, jadi pesan error tidak ikut beranimasi.

- [ ] **Step 5: Ganti render pesan chat (tanpa bubble)**

Ganti seluruh blok `workspaceMessages.map(...)` di dalam `.flex-grow overflow-y-auto p-5 scroll-smooth no-scrollbar` (baris ~2038-2062) dengan:

```tsx
{workspaceMessages.map((msg, idx) => {
  const isAi = msg.role !== 'user';
  const isLast = idx === workspaceMessages.length - 1;
  const shouldType = isAi && isLast && lastTypedContent !== null && msg.content === lastTypedContent;
  return (
    <div key={idx} className={`flex w-full ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex flex-col gap-1.5 max-w-[85%] ${isAi ? 'items-start' : 'items-end'}`}>
        {isAi && <Logo variant="white" size={14} />}
        {shouldType ? (
          <TypingText
            text={msg.content}
            showCursor
            speed={15}
            onComplete={scrollChatToBottom}
            className="text-[13px] text-zinc-300"
          />
        ) : isAi ? (
          <div className="markdown-body text-[13px] text-zinc-300 leading-relaxed">
            <Markdown>{msg.content}</Markdown>
          </div>
        ) : (
          <div className="text-[13px] leading-relaxed text-zinc-100">{msg.content}</div>
        )}
      </div>
    </div>
  );
})}
```

- [ ] **Step 6: Ganti indikator mengetik**

Ganti blok `{isEditingPortfolio && (...)}` (baris ~2064-2081) dengan:

```tsx
{isEditingPortfolio && (
  <div className="flex w-full justify-start animate-in fade-in duration-300">
    <div className="flex items-center gap-2 pl-0.5">
      <Logo variant="white" size={14} />
      <span className="text-[12px] text-zinc-500">Sedang memikirkan</span>
      <span className="flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  </div>
)}
```

- [ ] **Step 7: Pasang ref scroll pada container pesan**

Pada `<div className="flex-grow overflow-y-auto p-5 scroll-smooth no-scrollbar">` (baris ~2036), tambahkan `ref={chatScrollRef}`.

- [ ] **Step 8: Verifikasi lint + build**

Run: `npm run lint` lalu `npm run build`
Expected: keduanya lolos tanpa error.

- [ ] **Step 9: Cek manual di browser**

Run dev (`npm run dev`) lalu:
1. Generate portofolio → pesan sambutan AI muncul ketik demi ketik dengan kursor ▍.
2. Kirim instruksi chat → indikator "Sedang memikirkan" + 3 titik pulsing halus (bukan naik-turun), setelah itu jawaban AI ketik demi ketik.
3. Tidak ada bubble (background/border) di pesan mana pun. Logo putih tampil di tiap pesan AI.
4. Refresh halaman → pesan tampil penuh tanpa animasi ulang.

- [ ] **Step 10: Commit**

```bash
git add src/pages/CanvasPage.tsx
git commit -m "feat: chat AI tanpa bubble, logo putih, typewriter, indikator berpikir halus"
```

---

### Task 3: Panel langkah loading — daftar ikon minimalis (Bahasa Indonesia)

**Files:**
- Modify: `src/pages/CanvasPage.tsx:4` (import lucide-react: tambah `Fingerprint`, `Layers`, `PenTool`, `Monitor`)
- Modify: `src/pages/CanvasPage.tsx:1853-1892` (blok langkah)

**Interfaces:**
- Consumes: state `loadingPct` (sudah ada). Ikon lucide.
- Produces: daftar 5 langkah berikon dengan status warna (selesai ✓ hijau / aktif titik biru / belum redup). Task 4 membaca `loadingPct === 95` untuk area progress bawah.

- [ ] **Step 1: Tambah ikon ke import lucide**

Di baris import lucide-react (baris 4), tambahkan `Fingerprint`, `Layers`, `PenTool`, `Monitor` ke daftar kurung kurawal. (`FileText` sudah ada.)

- [ ] **Step 2: Ganti blok langkah**

Ganti seluruh blok `{/* Cinematic Real-time Modular Build Indicators */} ... </div>` (baris ~1853-1892) dengan:

```tsx
{/* Build steps: minimal, ikon per langkah */}
<div className="flex flex-col gap-1 mb-8 relative z-10">
  {[
    { label: "Analisis Identitas", icon: Fingerprint, threshold: 20 },
    { label: "Arsitektur Portofolio", icon: Layers, threshold: 45 },
    { label: "Komposisi Visual", icon: PenTool, threshold: 70 },
    { label: "Penyusunan Konten", icon: FileText, threshold: 90 },
    { label: "Render Final", icon: Monitor, threshold: 100 }
  ].map((step, idx, arr) => {
    const prevThreshold = idx === 0 ? 0 : arr[idx - 1]!.threshold;
    const isActive = loadingPct >= prevThreshold && loadingPct < step.threshold;
    const isCompleted = loadingPct >= step.threshold;
    const StepIcon = step.icon;
    return (
      <div key={idx} className="flex items-center gap-3 py-2 transition-opacity duration-500">
        <StepIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : isCompleted ? 'text-zinc-500' : 'text-zinc-700'}`} />
        <span className={`text-[13px] ${isActive ? 'text-white font-medium' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'}`}>{step.label}</span>
        {isCompleted && <span className="ml-auto text-emerald-500 text-xs leading-none">✓</span>}
        {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
      </div>
    );
  })}
</div>
```

- [ ] **Step 3: Verifikasi lint + build**

Run: `npm run lint` lalu `npm run build`
Expected: keduanya lolos.

- [ ] **Step 4: Cek manual**

Run dev, generate portofolio. Selama loading, kolom kiri menampilkan 5 langkah berikon tanpa kotak/kapsul: langkah berjalan ikon biru + titik biru pulsing halus, selesai ikon redup + ✓ hijau, belum redup.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CanvasPage.tsx
git commit -m "feat: panel langkah loading minimalis dengan ikon (Bahasa Indonesia)"
```

---

### Task 4: Fix "95% nge-lag" — indeterminate saat AI masih kerja

**Files:**
- Modify: `src/pages/CanvasPage.tsx:1894-1902` (blok progress bawah "Penyelarasan Sistem")
- Modify: `src/pages/CanvasPage.tsx:1944-1947` (angka persen di ring kanan)

**Interfaces:**
- Consumes: state `loadingPct` (sudah ada). Pacer memegang `loadingPct` di 95 selama AI generate (tidak berubah — `server/app.ts` tidak disentuh).
- Produces: saat `loadingPct === 95`, kolom kiri menampilkan "Menyiapkan hasil akhir…" + bar berdenyut (indeterminate), dan ring kanan menampilkan "…" berdenyut.

- [ ] **Step 1: Ganti blok progress bawah**

Ganti blok `<div className="space-y-3"> ... </div>` (baris ~1894-1902) dengan:

```tsx
<div className="space-y-3">
  <div className="flex justify-between items-center text-xs">
    <span className="text-zinc-500">{loadingPct === 95 ? 'Menyiapkan hasil akhir…' : 'Penyelarasan Sistem'}</span>
    {loadingPct === 95 ? (
      <span className="text-zinc-500 animate-pulse">masih bekerja…</span>
    ) : (
      <span className="text-white font-bold">{loadingPct}%</span>
    )}
  </div>
  <div className="h-1 w-full bg-zinc-900 overflow-hidden rounded-full relative">
    {loadingPct === 95 ? (
      <motion.div
        className="absolute inset-y-0 w-1/3 rounded-full bg-blue-500/70"
        initial={{ x: '-100%' }}
        animate={{ x: '300%' }}
        transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
      />
    ) : (
      <motion.div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" initial={{ width: 0 }} animate={{ width: `${loadingPct}%` }} transition={{ ease: 'circOut', duration: 0.1 }} />
    )}
  </div>
</div>
```

- [ ] **Step 2: Ganti angka persen di ring kanan**

Di kolom kanan (baris ~1944-1947), ganti blok angka persen:

```tsx
<div className="absolute flex flex-col items-center justify-center">
  <span className={`text-xl md:text-2xl font-bold text-white tracking-tighter ${loadingPct === 95 ? 'animate-pulse' : ''}`}>
    {loadingPct === 95 ? '…' : `${loadingPct}%`}
  </span>
</div>
```

- [ ] **Step 3: Verifikasi lint + build**

Run: `npm run lint` lalu `npm run build`
Expected: keduanya lolos.

- [ ] **Step 4: Cek manual**

Generate portofolio (AI sungguhan). Saat loading, ketika bar nyentuh 95%, angka 95% tidak lagi tampil beku — kolom kiri menampilkan "Menyiapkan hasil akhir…" + bar biru yang bergeser pelan, ring kanan menampilkan "…". Setelah AI selesai, langsung 100% → halaman portofolio.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CanvasPage.tsx
git commit -m "fix: tampilan 95% loading jadi indeterminate (tidak terasa nge-lag)"
```

---

## Self-Review

**1. Spec coverage:**
- Bagian A (loading): Task 3 (daftar ikon langkah Bahasa Indonesia) + Task 4 (95% fix) ✓
- Bagian B (chat): Task 1 (TypingText cursor) + Task 2 (tanpa bubble, logo putih, typewriter, indikator baru) ✓
- File baru yang disebut spec (`TypewriterMarkdown.tsx`) diganti memakai komponen `TypingText.tsx` yang **sudah ada** di codebase (hampir identik fungsinya) — ditambah `showCursor`. Ini lebih DRY daripada menambah komponen duplikat; hasil visual sama. Sudah dicatat di Global Constraints? — tambahkan catatan ini di Task 2 header supaya implementer tidak bingung kenapa file baru tidak dibuat.

**2. Placeholder scan:** Tidak ada "TBD"/"TODO". Semua step berisi kode lengkap. ✓

**3. Type consistency:** `lastTypedContent` (string|null) dipakai konsisten di Task 2; `showCursor` didefinisikan Task 1, dipakai Task 2; ikon `Fingerprint/Layers/PenTool/Monitor` di-import Task 3 dan dipakai di blok yang sama. ✓

---

## Execution Handoff

Plan selesai dan disimpan di `docs/superpowers/plans/2026-08-06-ui-chat-loading-upgrade.md`. Dua opsi eksekusi:

1. **Subagent-Driven (direkomendasikan)** — tiap task dijalankan subagent baru, aku review di antara task, iterasi cepat.
2. **Inline Execution** — task dijalankan langsung di sesi ini pakai executing-plans, batch dengan checkpoint.

Mau pakai yang mana?
