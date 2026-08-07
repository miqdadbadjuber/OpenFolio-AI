// Deteksi pesan sapaan / obrolan ringan di chat AI.
// Kalau SELURUH pesan user hanya sapaan/ucapan (mis. "halo"), server balas
// instan tanpa memanggil Gemini — biar chat terasa cepat dan tidak membuang
// kuota. Pesan yang mengandung instruksi nyata apa pun TIDAK terdeteksi
// (selalu diteruskan ke Gemini, konservatif: lebih baik lambat tapi benar).
export function detectCasualMessage(message: string): string | null {
  const text = String(message || "").trim();
  if (!text) return null;

  const greeting =
    /^(halo|hai|hi|hello|hey|hallo|hii|pagi|selamat pagi|siang|selamat siang|sore|selamat sore|malam|selamat malam|assalamualaikum|assalamu'alaikum|permisi|test|tes)\s*[!.,]?\s*$/i;
  const thanks =
    /^(makasih|makasi|terima kasih|terimakasih|thank you|thanks|thx|ok|oke|okay|siap|mantap|keren|bagus|nice)\s*[!.,]?\s*$/i;
  const smallTalk =
    /^(apa kabar|kabar|kamu siapa|siapa kamu|kamu bisa apa|bisa apa|apa yang bisa kamu lakukan|help|bantuan)\s*[!.,]?\s*$/i;

  if (greeting.test(text)) {
    return "Halo juga! 👋 Aku asisten OpenFolio. Ceritakan saja apa yang mau kamu ubah, contohnya: \"ganti warna aksen jadi hijau\", \"tambah proyek bernama ...\", atau \"perbaiki teks di bagian atas\". Mau mulai dari mana?";
  }
  if (thanks.test(text)) {
    return "Sama-sama! 😊 Ada lagi yang mau diubah dari portofolio kamu?";
  }
  if (smallTalk.test(text)) {
    return "Aku asisten OpenFolio yang bantu menyusun portofolio lewat chat. Contoh instruksi: \"ubah warna jadi biru\", \"tambah proyek Dashboard Analitik\", \"pendekkan deskripsi di hero\". Mau coba yang mana?";
  }
  return null;
}
