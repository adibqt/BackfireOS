/**
 * Groq client — OpenAI-compatible chat completions with token streaming.
 *
 * Boardroom Mode runs a live multi-agent debate, so the model output must arrive
 * token-by-token (SSE → typing effect). Groq's free tier streams fast, which is
 * exactly what a watchable transcript needs. We deliberately do NOT pull in a
 * heavy agent framework: those make hidden, redundant calls that would blow the
 * 30 RPM / 250-requests-a-day budget. Instead the debate is a hand-rolled state
 * machine (see lib/boardroom/engine.ts) that makes exactly one call per turn.
 *
 * Two models, by design (the "hybrid" architecture):
 * - SCOUT_MODEL: the default for most personas — lightning-fast, cheap on quota.
 * - COMPOUND_MODEL: reserved for the single adversarial Activist, to showcase
 *   agentic tool-use without draining the daily request budget.
 */

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Fast, cheap default — most debate personas run on this. */
export const SCOUT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
/** Agentic, tool-using model — reserved for the lone Activist persona. */
export const COMPOUND_MODEL = "groq/compound";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function getGroqApiKey(): string | undefined {
  const key = process.env.GROQ_API_KEY?.trim();
  return key || undefined;
}

export function isGroqConfigured(): boolean {
  return Boolean(getGroqApiKey());
}

interface GroqStreamChunk {
  choices?: Array<{
    delta?: { content?: string | null };
    finish_reason?: string | null;
  }>;
}

/**
 * Streams a chat completion from Groq, invoking `onToken` for each text delta as
 * it arrives, and resolves with the fully accumulated text. Parsing follows the
 * OpenAI SSE wire format: `data: {json}` lines terminated by a blank line, with a
 * final `data: [DONE]` sentinel.
 *
 * `signal` lets the caller abort an in-flight turn (e.g. the client disconnected
 * mid-debate) so we stop burning the request budget on output nobody will read.
 */
export async function streamGroqChat(
  messages: ChatMessage[],
  model: string,
  onToken: (token: string) => void,
  options: {
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  } = {}
): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const response = await fetch(GROQ_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 600,
    }),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Groq request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the trailing partial line in the buffer for the next chunk.
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice("data:".length).trim();
      if (payload === "[DONE]") continue;

      let chunk: GroqStreamChunk;
      try {
        chunk = JSON.parse(payload) as GroqStreamChunk;
      } catch {
        continue; // Ignore keep-alive / malformed fragments.
      }

      const token = chunk.choices?.[0]?.delta?.content;
      if (token) {
        full += token;
        onToken(token);
      }
    }
  }

  return full;
}

/**
 * Non-streaming JSON completion via Groq (response_format: json_object). Used for
 * the debate's final synthesis verdict, where we want a single structured object
 * rather than a typed-out transcript.
 */
export async function groqJson<T>(
  messages: ChatMessage[],
  model: string = SCOUT_MODEL,
  signal?: AbortSignal
): Promise<T> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const response = await fetch(GROQ_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Groq JSON request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned no content");

  const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as T;
}
