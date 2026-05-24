/**
 * Seed BNSENTMIX samples into Supabase pgvector.
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 *
 * Usage: pnpm seed:bnsentmix
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { BNSENTMIX_SAMPLES } from "../lib/bnsentmix-data";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!url || !key || !openaiKey) {
    console.error("Missing Supabase or OpenAI env vars. See .env.example");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const openai = new OpenAI({ apiKey: openaiKey });

  console.log(`Seeding ${BNSENTMIX_SAMPLES.length} BNSENTMIX samples...`);

  for (const sample of BNSENTMIX_SAMPLES) {
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: sample.text,
    });
    const embedding = embeddingRes.data[0]?.embedding;
    if (!embedding) continue;

    const { error } = await supabase.from("bnsentmix_samples").upsert({
      id: sample.id,
      text: sample.text,
      sentiment: sample.sentiment,
      embedding,
    });

    if (error) console.error(`Failed ${sample.id}:`, error.message);
    else console.log(`Seeded ${sample.id}`);
  }

  console.log("Done.");
}

main();
