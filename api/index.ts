// @ts-ignore file di-generate otomatis oleh `npm run build:server`
import { app } from "../dist-server/index.js";

// Edit AI mengembalikan delta yang jauh lebih cepat, tapi generate portofolio
// tetap butuh waktu (10-30s) untuk data ukuran nyata. Batas default Vercel
// Hobby 10s terlalu pendek -> fungsi diputus -> "gagal". Naikkan ke 60s.
export const maxDuration = 60;

export default app;
