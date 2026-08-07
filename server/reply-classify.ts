// Klasifikasi respons JSON dari Gemini di route edit.
// Gemini sebagai asisten percakapan bisa membalas 2 bentuk:
//   - { explanation, data }  → EDIT: data adalah delta portofolio (atau portofolio polos ber-name).
//   - { explanation } (tanpa data) → CHAT: pertanyaan aplikasi / di luar topik, tanpa mengubah apa pun.
export type GeminiReply =
  | { kind: "chat"; explanation: string }
  | { kind: "edit"; data: any; explanation?: string };

export function classifyReply(parsed: any): GeminiReply | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  // Percakapan: ada explanation, TIDAK ada data sama sekali (hilang atau null),
  // dan bukan portofolio polos (tidak punya name di top level).
  if (
    parsed.explanation &&
    (parsed.data === undefined || parsed.data === null) &&
    !parsed.name
  ) {
    return { kind: "chat", explanation: parsed.explanation };
  }

  // Edit: data berbentuk object (delta) ATAU portofolio polos tanpa wrapper.
  let data: any = null;
  if (parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)) {
    data = parsed.data;
  } else if (parsed.name) {
    data = parsed;
  }
  if (data) {
    return { kind: "edit", data, explanation: parsed.explanation };
  }

  return null;
}
