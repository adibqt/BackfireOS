import OpenAI from "openai";
import { BNSENTMIX_SAMPLES } from "./bnsentmix-data";
import { createAdminClient, isSupabaseRagReady } from "./supabase/admin";

export interface RagSample {
  id: string;
  text: string;
  sentiment: string;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function scoreOverlap(query: Set<string>, sample: string): number {
  const sampleTokens = tokenize(sample);
  let overlap = 0;
  for (const token of query) {
    if (sampleTokens.has(token)) overlap += 1;
  }
  return overlap;
}

function retrieveLocal(query: string, count: number): RagSample[] {
  const queryTokens = tokenize(query);
  return [...BNSENTMIX_SAMPLES]
    .map((sample) => ({
      ...sample,
      score: scoreOverlap(queryTokens, sample.text),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ id, text, sentiment }) => ({ id, text, sentiment }));
}

async function retrieveFromPgvector(
  query: string,
  count: number
): Promise<RagSample[]> {
  const supabase = createAdminClient();
  if (!supabase) return retrieveLocal(query, count);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const embedding = embeddingRes.data[0]?.embedding;
  if (!embedding) return retrieveLocal(query, count);

  const { data, error } = await supabase.rpc("match_bnsentmix", {
    query_embedding: embedding,
    match_count: count,
  });

  if (error || !data?.length) {
    console.warn("pgvector RAG fallback to local:", error?.message);
    return retrieveLocal(query, count);
  }

  return (data as RagSample[]).map((row) => ({
    id: String(row.id),
    text: row.text,
    sentiment: row.sentiment,
  }));
}

export async function retrieveBanglishExamples(
  query: string,
  count = 5
): Promise<RagSample[]> {
  if (isSupabaseRagReady()) {
    return retrieveFromPgvector(query, count);
  }
  return retrieveLocal(query, count);
}

export function formatRagExamples(samples: RagSample[]): string {
  if (samples.length === 0) return "No examples available.";
  return samples
    .map((s) => `- [${s.sentiment}] ${s.text} (id: ${s.id})`)
    .join("\n");
}
