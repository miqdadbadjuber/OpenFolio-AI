import { GoogleGenAI } from "@google/genai";

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Hello"
    });
    console.log("SUCCESS gemini-3.6-flash with GEMINI_API_KEY");
  } catch(e: any) {
    console.log("FAILED gemini-3.6-flash with GEMINI_API_KEY -", e.message);
  }
}
run();
