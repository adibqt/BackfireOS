import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const TEXT_MODEL = "gemini-3.5-flash";
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const IMAGE_MODEL = "imagen-4.0-generate-001";

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

export function getGeminiImageApiKey(): string | undefined {
  const imageKey = process.env.GEMINI_IMAGE_API_KEY?.trim();
  if (imageKey) return imageKey;
  return getGeminiApiKey();
}

/** Keys for seeding embeddings. Comma-separated GEMINI_EMBEDDING_API_KEY, else GEMINI_API_KEY. */
export function getGeminiEmbeddingApiKeys(): string[] {
  const raw = process.env.GEMINI_EMBEDDING_API_KEY?.trim();
  const keys = raw
    ? raw.split(",").map((key) => key.trim()).filter(Boolean)
    : [];

  const primary = getGeminiApiKey();
  if (primary && !keys.includes(primary)) {
    keys.push(primary);
  }

  return keys;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export function isGeminiImageConfigured(): boolean {
  return Boolean(getGeminiImageApiKey());
}

function getTextClient(): GoogleGenerativeAI {
  const key = getGeminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenerativeAI(key);
}

function getGenAIClient(apiKey?: string): GoogleGenAI {
  const key = apiKey ?? getGeminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey: key });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("quota")
  );
}

function isDailyEmbeddingQuotaExhausted(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("PerDay") ||
    message.includes("embed_content_free_tier_requests")
  );
}

function parseRetryDelayMs(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  const retryMatch = message.match(/retry in ([\d.]+)s/i);
  if (retryMatch) {
    return Math.ceil(Number.parseFloat(retryMatch[1]) * 1000);
  }

  try {
    const parsed = JSON.parse(message) as {
      error?: { details?: Array<{ "@type"?: string; retryDelay?: string }> };
    };
    for (const detail of parsed.error?.details ?? []) {
      if (detail.retryDelay?.endsWith("s")) {
        const seconds = Number.parseFloat(detail.retryDelay.replace("s", ""));
        if (!Number.isNaN(seconds)) {
          return Math.ceil(seconds * 1000);
        }
      }
    }
  } catch {
    // fall through
  }

  return 3000;
}

export async function embedText(
  text: string,
  apiKey?: string
): Promise<number[]> {
  const ai = getGenAIClient(apiKey);
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const values = result.embeddings?.[0]?.values;
  if (!values?.length) {
    throw new Error("No embedding returned from Gemini");
  }
  return values;
}

/** Seed script helper: rotate keys and retry rate limits. */
export async function embedTextForSeed(text: string): Promise<number[]> {
  const keys = getGeminiEmbeddingApiKeys();
  if (keys.length === 0) {
    throw new Error("GEMINI_API_KEY or GEMINI_EMBEDDING_API_KEY not set");
  }

  let lastError: Error | undefined;

  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const apiKey = keys[keyIndex];

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await embedText(text, apiKey);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!isRateLimitError(error)) {
          throw lastError;
        }

        if (isDailyEmbeddingQuotaExhausted(error)) {
          if (keyIndex < keys.length - 1) {
            console.warn(
              `Daily embedding quota exhausted for key ${keyIndex + 1}/${keys.length}. Trying next key...`
            );
            break;
          }
          throw lastError;
        }

        const delay = parseRetryDelayMs(error);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("Embedding failed");
}

function getImageGenAIClient(): GoogleGenAI {
  const key = getGeminiImageApiKey();
  if (!key) {
    throw new Error("GEMINI_IMAGE_API_KEY or GEMINI_API_KEY not set");
  }
  return new GoogleGenAI({ apiKey: key });
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

const TEXT_MAX_RETRIES = Number(process.env.GEMINI_TEXT_MAX_RETRIES ?? 5);
const TEXT_MAX_RETRY_DELAY_MS = 30_000;

/**
 * Retries a text/vision call on rate-limit (429) errors, waiting the delay the
 * API asks for (capped). Without this a single 429 — common on the free tier,
 * which allows only a few requests per minute — would surface as a hard failure
 * and drop the run to mock data.
 */
async function withTextRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= TEXT_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === TEXT_MAX_RETRIES) {
        throw error;
      }
      const delay = Math.min(parseRetryDelayMs(error), TEXT_MAX_RETRY_DELAY_MS);
      console.warn(
        `Gemini rate-limited; retrying in ${delay}ms (attempt ${attempt + 1}/${TEXT_MAX_RETRIES}).`
      );
      await sleep(delay);
    }
  }
  throw lastError;
}

export async function generateJson<T>(
  prompt: string,
  model = TEXT_MODEL
): Promise<T> {
  const genAI = getTextClient();
  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await withTextRetry(() =>
    generativeModel.generateContent(prompt)
  );
  return parseJson<T>(result.response.text());
}

export async function generateText(
  prompt: string,
  model = TEXT_MODEL
): Promise<string> {
  const genAI = getTextClient();
  const generativeModel = genAI.getGenerativeModel({ model });
  const result = await withTextRetry(() =>
    generativeModel.generateContent(prompt)
  );
  return result.response.text();
}

export async function describeImage(
  prompt: string,
  base64: string,
  mimeType = "image/jpeg"
): Promise<string> {
  const genAI = getTextClient();
  const generativeModel = genAI.getGenerativeModel({ model: TEXT_MODEL });

  const result = await withTextRetry(() =>
    generativeModel.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } },
    ])
  );

  return result.response.text();
}

/** Generate a satirical meme image; returns a data URL for inline display. */
export async function generateMemeImage(
  visualPrompt: string,
  caption?: string
): Promise<string> {
  const ai = getImageGenAIClient();

  const scene = caption
    ? `Illustrate this joke: ${caption}. Scene: ${visualPrompt}. No text or words in the image.`
    : `Create a satirical Bangladeshi social media meme image. Bold visual parody, square format, no text. Scene: ${visualPrompt}`;

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: scene,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K",
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType ?? "image/png";
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image returned from Gemini image model");
}

export {
  TEXT_MODEL,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  IMAGE_MODEL,
};
