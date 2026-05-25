import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { GoogleGenAI } from "@google/genai";

async function main() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    console.error("No GEMINI_API_KEY");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const model = "gemini-3.1-flash-image-preview";

  try {
    const response = await ai.models.generateContent({
      model,
      contents:
        "Create a satirical Bangladeshi social media meme with bold text. A brand ad being mocked online.",
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K",
        },
      },
    });

    console.log("Candidates:", response.candidates?.length);
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    console.log("Parts:", parts.length);
    for (const [i, part] of parts.entries()) {
      console.log(`Part ${i}:`, Object.keys(part));
      if (part.text) console.log("  text:", part.text.slice(0, 100));
      if (part.inlineData) {
        console.log("  inlineData mime:", part.inlineData.mimeType);
        console.log("  inlineData len:", part.inlineData.data?.length);
      }
    }
    if (response.promptFeedback) console.log("promptFeedback:", response.promptFeedback);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

main();
