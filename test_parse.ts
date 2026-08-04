import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config({ path: "/app/applet/.env" }); // Try to load env if it exists elsewhere, or just simulate

function safeParseJSON(text: string, fallback: any = {}): any {
  if (!text) return fallback;
  
  let cleanText = text.trim();
  const start = cleanText.indexOf('{');
  const end = cleanText.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end >= start) {
    cleanText = cleanText.substring(start, end + 1);
  }

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Parse error:", e);
    return fallback;
  }
}

const mockResponse = `\`\`\`json
{
  "explanation": "Saya telah mengubah nama menjadi Budi sesuai instruksi.",
  "data": {
    "name": "Budi"
  }
}
\`\`\``;

console.log(safeParseJSON(mockResponse));
