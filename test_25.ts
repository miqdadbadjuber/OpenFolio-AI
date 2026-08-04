import { GoogleGenAI } from "@google/genai";

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_NEW });
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello"
    });
    console.log("SUCCESS gemini-2.5-flash");
  } catch(e: any) {
    console.log("FAILED gemini-2.5-flash -", e.message);
  }
}
run();
