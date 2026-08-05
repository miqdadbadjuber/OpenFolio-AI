import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

async function run() {
  const currentData = {"name":"f","role":"f","hero_description":"hmmm","hero_image_url":"https://example.com/a.jpg","projects":[],"career":[]};
  const userMessage = "ubah namanya menjadi budi";
  
  const prompt = `Kamu adalah OpenFolio Identity Editor.
Tugasmu adalah memodifikasi data portofolio JSON agar sesuai dengan instruksi revisi user tanpa merusak Schema Identity Behavior.

⚠️ ZERO FICTION POLICY & ATURAN REVISI:
1. DILARANG MERUSAK SCHEMA: Simpan struktur bersarang (nested structure) persis sama.
2. DILARANG BERHALUSINASI: Jangan tambahkan data fiksi. Pelihara kebenaran data (TRUTH-PRESERVING).
3. PENGHAPUSAN: Jika user meminta penghapusan, kosongkan data dengan null, "", atau [].
4. BAHASA: Gunakan bahasa kasual profesional di 'explanation'.
5. WAJIB FULL JSON: Kembalikan KESELURUHAN (FULL) struktur JSON portofolio. Jangan hanya mengembalikan bagian yang berubah. Sertakan kembali data yang tidak berubah agar tidak hilang!

⚠️ OBJECT JSON PORTOFOLIO SAAT INI:
${JSON.stringify(currentData, null, 2)}

INSTRUKSI REVISI USER:
"${userMessage}"

Format JSON:
{
  "explanation": "string",
  "data": { ... seluruh object portofolio secara lengkap (FULL KESELURUHAN) termasuk yang dimodifikasi ... }
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    console.log("Response text:", response.text);
    
    // safeParseJSON equivalent
    let text = response.text ?? "";
    let cleanText = text.trim();
    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end >= start) {
      cleanText = cleanText.substring(start, end + 1);
    }
    const parsed = JSON.parse(cleanText);
    console.log("Parsed Name:", parsed?.data?.name);
    
  } catch (e: any) {
    console.error("Error:", e);
  }
}
run();
