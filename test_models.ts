import { GoogleGenAI } from "@google/genai";

async function testModel(modelName: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_NEW });
  try {
    const res = await ai.models.generateContent({
      model: modelName,
      contents: "Hello"
    });
    console.log(`${modelName}: SUCCESS`);
  } catch(e: any) {
    console.log(`${modelName}: FAILED -`, e.message);
  }
}

async function run() {
  await testModel("gemini-1.5-flash");
  await testModel("gemini-2.0-flash");
  await testModel("gemini-3.0-flash");
}
run();
