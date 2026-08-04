import { GoogleGenAI } from "@google/genai";

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_NEW });
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Hello"
    });
    console.log("SUCCESS gemini-3.6-flash");
  } catch(e: any) {
    console.log("FAILED gemini-3.6-flash -", e.message);
  }
}
run();
