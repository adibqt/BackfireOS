import type { AgentVerdict, CampaignInput, MemeResult } from "./agents/types";
import { generateJson, generateMemeImage, isGeminiConfigured, isGeminiImageConfigured } from "./gemini";
import { generateMemeFallbackSvg } from "./meme-fallback";
import {
  generatePollinationsImage,
  isPollinationsConfigured,
} from "./pollinations";

interface MemeConcept {
  caption: string;
  visualPrompt: string;
  memeabilityScore: number;
}

function mockMemes(campaign: CampaignInput, verdicts: AgentVerdict[]): MemeResult[] {
  const memeEngineer = verdicts.find((v) => v.agentId === "meme_engineer");
  const baseScore = memeEngineer?.severity ?? 70;

  return [
    {
      caption: `POV: ${campaign.slogan} but make it cringe`,
      imageUrl: generateMemeFallbackSvg(`POV: ${campaign.slogan}`, baseScore),
      memeabilityScore: Math.min(100, baseScore + 5),
      imageFallback: true,
    },
    {
      caption: "Brand team vs Internet — who wins?",
      imageUrl: generateMemeFallbackSvg("Brand team vs Internet", baseScore - 5),
      memeabilityScore: Math.max(40, baseScore - 5),
      imageFallback: true,
    },
    {
      caption: "Dhaka Meme Engineer approved this roast",
      imageUrl: generateMemeFallbackSvg("Dhaka Meme Engineer approved", baseScore),
      memeabilityScore: baseScore,
      imageFallback: true,
    },
    {
      caption: `Rival brand reply: "${campaign.slogan}? Really?"`,
      imageUrl: generateMemeFallbackSvg(`"${campaign.slogan}? Really?"`, baseScore + 2),
      memeabilityScore: Math.min(100, baseScore + 2),
      imageFallback: true,
    },
  ];
}

async function generateMemeConcepts(
  campaign: CampaignInput,
  verdicts: AgentVerdict[]
): Promise<MemeConcept[]> {
  if (!isGeminiConfigured()) {
    return mockMemes(campaign, verdicts).map((m) => ({
      caption: m.caption,
      visualPrompt: `Satirical Bangladeshi social media meme about: ${m.caption}`,
      memeabilityScore: m.memeabilityScore,
    }));
  }

  const attacks = verdicts.map((v) => v.sampleAttack).join("\n");

  return generateJson<MemeConcept[]>(
    `Generate 4 parody meme concepts for this Bangladeshi campaign that could go viral for the WRONG reasons.

Slogan: ${campaign.slogan}
Sample attacks:
${attacks}

Rules for each concept:
- "caption": Banglish meme caption (shown below the image in the UI — this is the main text).
- "visualPrompt": A concrete scene description that illustrates THE SAME JOKE as the caption.
  Describe people, places, objects, and emotions — NOT meme template names (no Drake, Distracted Boyfriend, etc.).
  Do NOT include any text, words, or labels that should appear in the image.
  Example: "Frustrated Bangladeshi office worker staring at phone showing a long cash-out fee receipt while an agent shop queue forms behind him."

Return ONLY a JSON array:
[
  {
    "caption": "Banglish meme caption",
    "visualPrompt": "Concrete visual scene matching the caption joke",
    "memeabilityScore": 0-100
  }
]`
  );
}

async function generateImage(
  visualPrompt: string,
  caption: string,
  score: number,
  index: number
): Promise<{ imageUrl: string; imageFallback: boolean; imageError?: string }> {
  let lastError: string | undefined;

  if (isPollinationsConfigured()) {
    try {
      const imageUrl = await generatePollinationsImage(
        { caption, visualPrompt },
        index * 9973
      );
      return { imageUrl, imageFallback: false };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Pollinations image failed";
      console.error("Pollinations meme image failed:", lastError);
    }
  }

  if (!isGeminiImageConfigured() && !isPollinationsConfigured()) {
    return {
      imageUrl: generateMemeFallbackSvg(caption, score),
      imageFallback: true,
      imageError:
        "Set POLLINATIONS_API_KEY (recommended) or GEMINI_IMAGE_API_KEY for meme images.",
    };
  }

  if (isGeminiImageConfigured()) {
    try {
      const imageUrl = await generateMemeImage(visualPrompt, caption);
      return { imageUrl, imageFallback: false };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image generation failed";
      console.error("Meme image generation failed:", message);

      return {
        imageUrl: generateMemeFallbackSvg(caption, score),
        imageFallback: true,
        imageError: parseImageError(message),
      };
    }
  }

  return {
    imageUrl: generateMemeFallbackSvg(caption, score),
    imageFallback: true,
    imageError: parseImageError(lastError ?? "Pollinations image generation failed"),
  };
}

function parseImageError(message: string): string {
  if (message.includes("429") || message.includes("quota")) {
    return "Gemini image quota exceeded — use POLLINATIONS_API_KEY for meme images instead.";
  }
  if (message.includes("402") || message.includes("balance")) {
    return "Pollinations balance exhausted — top up at enter.pollinations.ai.";
  }
  if (message.includes("404") || message.includes("not found")) {
    return "Image model unavailable on your API key.";
  }
  return "Image generation failed — showing text preview instead.";
}

export async function generateMemes(
  campaign: CampaignInput,
  verdicts: AgentVerdict[]
): Promise<{ memes: MemeResult[]; imageWarning?: string }> {
  const concepts = await generateMemeConcepts(campaign, verdicts);
  let imageWarning: string | undefined;

  const memes = await Promise.all(
    concepts.slice(0, 4).map(async (concept, index) => {
      const score = Math.max(
        0,
        Math.min(100, Math.round(concept.memeabilityScore))
      );
      const { imageUrl, imageFallback, imageError } = await generateImage(
        concept.visualPrompt,
        concept.caption,
        score,
        index
      );
      if (imageFallback && imageError && !imageWarning) {
        imageWarning = imageError;
      }
      return {
        caption: concept.caption,
        imageUrl,
        memeabilityScore: score,
        imageFallback,
      } satisfies MemeResult;
    })
  );

  return { memes, imageWarning };
}
