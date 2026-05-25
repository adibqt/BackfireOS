const POLLINATIONS_BASE_URL = "https://gen.pollinations.ai";
const DEFAULT_IMAGE_MODEL = "flux";

export function getPollinationsApiKey(): string | undefined {
  const key = process.env.POLLINATIONS_API_KEY?.trim();
  return key || undefined;
}

export function getPollinationsImageModel(): string {
  return process.env.POLLINATIONS_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}

export function isPollinationsConfigured(): boolean {
  return Boolean(getPollinationsApiKey());
}

export interface MemeImageInput {
  caption: string;
  visualPrompt: string;
}

function buildMemePrompt({ caption, visualPrompt }: MemeImageInput): string {
  return [
    "Single-panel satirical illustration for a Bangladeshi social media roast.",
    `Joke to illustrate: ${caption}`,
    `Scene: ${visualPrompt}`,
    "Contemporary Dhaka or Bangladesh setting, mobile banking culture, expressive faces, situational humor.",
    "Photorealistic or polished digital illustration, square composition, viral social media aesthetic.",
    "CRITICAL: no text, no words, no letters, no captions, no labels, no speech bubbles, no watermarks anywhere in the image.",
  ].join(" ");
}

const MEME_NEGATIVE_PROMPT =
  "text, words, letters, typography, captions, labels, watermark, logo, speech bubble, meme template text, misspelled english, garbled script, drake meme, distracted boyfriend meme, impact font";

async function generateViaOpenAiEndpoint(prompt: string, seed?: number): Promise<string> {
  const apiKey = getPollinationsApiKey();
  if (!apiKey) throw new Error("POLLINATIONS_API_KEY not set");

  const response = await fetch(`${POLLINATIONS_BASE_URL}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getPollinationsImageModel(),
      prompt,
      size: "1024x1024",
      response_format: "b64_json",
      seed: seed ?? -1,
      nologo: true,
      negative_prompt: MEME_NEGATIVE_PROMPT,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pollinations POST failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };

  const b64 = data.data?.[0]?.b64_json;
  if (b64) {
    return `data:image/jpeg;base64,${b64}`;
  }

  const url = data.data?.[0]?.url;
  if (url) {
    return url;
  }

  throw new Error("Pollinations returned no image data");
}

async function generateViaGetEndpoint(prompt: string, seed?: number): Promise<string> {
  const apiKey = getPollinationsApiKey();
  if (!apiKey) throw new Error("POLLINATIONS_API_KEY not set");

  const params = new URLSearchParams({
    model: getPollinationsImageModel(),
    width: "1024",
    height: "1024",
    seed: String(seed ?? -1),
    nologo: "true",
    negative_prompt: MEME_NEGATIVE_PROMPT,
  });

  const response = await fetch(
    `${POLLINATIONS_BASE_URL}/image/${encodeURIComponent(prompt)}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pollinations GET failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error("Pollinations returned an empty image");
  }

  return `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`;
}

/** Generate a meme image via Pollinations; returns a data URL or HTTPS URL. */
export async function generatePollinationsImage(
  input: MemeImageInput,
  seed?: number
): Promise<string> {
  const prompt = buildMemePrompt(input);

  try {
    return await generateViaOpenAiEndpoint(prompt, seed);
  } catch (postError) {
    console.warn(
      "Pollinations POST failed, trying GET:",
      postError instanceof Error ? postError.message : postError
    );
    return generateViaGetEndpoint(prompt, seed);
  }
}

export { POLLINATIONS_BASE_URL, DEFAULT_IMAGE_MODEL };
