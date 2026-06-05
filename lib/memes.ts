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

- "memeabilityScore": 0-100, how likely THIS specific meme actually spreads. Score
  the joke honestly and relative to the others — most parodies of an ordinary
  campaign are forgettable. Reserve 70+ for a genuinely shareable hook; if you are
  reaching to mock a bland or wholesome campaign, score low.

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

const clampScore = (n: number) =>
  Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/**
 * Below this campaign-level memeability (the meme specialist's severity), a
 * campaign has too little parody potential to spread. Generating four memes
 * anyway just manufactures forgettable jokes, so we suppress them and let the UI
 * say "nothing memeable here".
 */
export const MEME_SUPPRESSION_THRESHOLD = 40;

export async function generateMemes(
  campaign: CampaignInput,
  verdicts: AgentVerdict[]
): Promise<{ memes: MemeResult[]; imageWarning?: string }> {
  const memeEngineer = verdicts.find((v) => v.agentId === "meme_engineer");

  // Short-circuit unmemeable campaigns before spending any concept/image calls.
  if (memeEngineer && memeEngineer.severity < MEME_SUPPRESSION_THRESHOLD) {
    return { memes: [] };
  }

  const concepts = (await generateMemeConcepts(campaign, verdicts)).slice(0, 4);
  let imageWarning: string | undefined;

  // A model rates its own jokes ~90 regardless of quality, so the per-concept
  // self-score is only a *relative* signal (which of the four lands hardest).
  // The memeability *level* is anchored to the meme specialist's calibrated
  // judgment of the campaign's intrinsic parody potential — so memes mocking a
  // wholesome, unmemeable campaign score low, as they should.
  const selfScores = concepts.map((c) => clampScore(c.memeabilityScore));
  const anchor = memeEngineer?.severity ?? (selfScores.length ? mean(selfScores) : 50);
  const meanSelf = selfScores.length ? mean(selfScores) : anchor;

  const memes = await Promise.all(
    concepts.map(async (concept, index) => {
      // Re-center each concept's self-score on the calibrated anchor, keeping
      // only its deviation from the batch mean as the relative-strength signal.
      const score = clampScore(anchor + (selfScores[index] - meanSelf));
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
