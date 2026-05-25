import { config } from "dotenv";
config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

async function tryModel(ai: GoogleGenAI, model: string) {
  try {
    const r = await ai.models.generateContent({
      model,
      contents: "Simple satirical meme, square, bold text",
      config: { responseModalities: ["IMAGE"] },
    });
    const part = r.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
    console.log(model, part ? "OK - got image" : "no image in response");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(model, msg.slice(0, 200));
  }
}

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  for (const m of [
    "gemini-3.1-flash-image-preview",
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.5-flash-image",
  ]) {
    await tryModel(ai, m);
  }
}

main();
