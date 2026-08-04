import { GoogleGenAI } from "@google/genai";

async function testKey(name: string, key: string | undefined) {
  if (!key) {
    console.log(`${name}: empty`);
    return;
  }
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello"
    });
    console.log(`${name}: SUCCESS`);
  } catch(e: any) {
    console.log(`${name}: FAILED -`, e.message);
  }
}

async function run() {
  await testKey("GEMINI_API_KEY", process.env.GEMINI_API_KEY);
  await testKey("GEMINI_API_KEY_NEW", process.env.GEMINI_API_KEY_NEW);
}
run();
