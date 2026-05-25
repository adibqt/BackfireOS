import { config } from "dotenv";
config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";
import { getGeminiImageApiKey } from "../lib/gemini";

async function main() {
  const key = getGeminiImageApiKey();
  const source = process.env.GEMINI_IMAGE_API_KEY?.trim()
    ? "GEMINI_IMAGE_API_KEY"
    : "GEMINI_API_KEY (fallback)";

  console.log("Image key source:", source);
  console.log("Key configured:", Boolean(key));

  if (!key) {
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: key });

  for (const model of [
    "gemini-3.1-flash-image-preview",
    "gemini-2.5-flash-image",
  ]) {
    try {
      const r = await ai.models.generateContent({
        model,
        contents: "Simple satirical meme, square, bold text",
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
        },
      });
      const part = r.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
      console.log(model, part ? "OK" : "no image in response");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("limit: 0")) {
        console.log(model, "FREE TIER QUOTA = 0 (billing required)");
      } else if (msg.includes("429")) {
        console.log(model, "429 quota exceeded");
      } else {
        console.log(model, msg.slice(0, 120));
      }
    }
  }
}

main();
