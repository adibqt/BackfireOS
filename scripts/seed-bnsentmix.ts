/**
 * Seed BnSentMix (Hugging Face) into Supabase pgvector.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 *
 * Usage:
 *   pnpm download:bnsentmix          # fetch dataset.csv once
 *   pnpm seed:bnsentmix              # seed all ~20k rows
 *   pnpm seed:bnsentmix -- --limit 500
 *   pnpm seed:bnsentmix -- --offset 500 --limit 500
 *   pnpm seed:bnsentmix -- --resume
 *   pnpm seed:bnsentmix -- --truncate
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  BNSENTMIX_CSV_PATH,
  BNSENTMIX_HF_DATASET_URL,
  bnsentmixRowId,
  parseBnSentMixCsv,
  type BnSentMixRow,
} from "../lib/bnsentmix";
import { embedTextForSeed } from "../lib/gemini";

const PROGRESS_PATH = "data/bnsentmix/.seed-progress.json";
const DEFAULT_DELAY_MS = 250;

type SeedProgress = {
  lastCompletedIndex: number;
  totalSeeded: number;
  updatedAt: string;
};

type SeedOptions = {
  limit?: number;
  offset: number;
  resume: boolean;
  truncate: boolean;
  delayMs: number;
};

function parseArgs(argv: string[]): SeedOptions {
  const options: SeedOptions = {
    offset: 0,
    resume: false,
    truncate: false,
    delayMs: DEFAULT_DELAY_MS,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--limit" && next) {
      options.limit = Number.parseInt(next, 10);
      i++;
    } else if (arg === "--offset" && next) {
      options.offset = Number.parseInt(next, 10);
      i++;
    } else if (arg === "--delay-ms" && next) {
      options.delayMs = Number.parseInt(next, 10);
      i++;
    } else if (arg === "--resume") {
      options.resume = true;
    } else if (arg === "--truncate") {
      options.truncate = true;
    }
  }

  return options;
}

async function loadProgress(): Promise<SeedProgress | null> {
  try {
    const raw = await readFile(PROGRESS_PATH, "utf8");
    return JSON.parse(raw) as SeedProgress;
  } catch {
    return null;
  }
}

async function saveProgress(progress: SeedProgress): Promise<void> {
  await mkdir(path.dirname(PROGRESS_PATH), { recursive: true });
  await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2), "utf8");
}

async function loadDatasetRows(): Promise<BnSentMixRow[]> {
  let csv: string;

  try {
    csv = await readFile(BNSENTMIX_CSV_PATH, "utf8");
  } catch {
    console.log("Local CSV not found. Downloading from Hugging Face...");
    const response = await fetch(BNSENTMIX_HF_DATASET_URL);
    if (!response.ok) {
      throw new Error(
        `Download failed: ${response.status}. Run: pnpm download:bnsentmix`
      );
    }
    csv = await response.text();
    await mkdir(path.dirname(BNSENTMIX_CSV_PATH), { recursive: true });
    await writeFile(BNSENTMIX_CSV_PATH, csv, "utf8");
  }

  const rows = parseBnSentMixCsv(csv);
  if (rows.length === 0) {
    throw new Error("No rows parsed from BnSentMix CSV.");
  }

  return rows;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!url || !key || !geminiKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY."
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const allRows = await loadDatasetRows();

  if (options.truncate) {
    const { error } = await supabase
      .from("bnsentmix_samples")
      .delete()
      .neq("id", "");
    if (error) {
      console.error("Truncate failed:", error.message);
      process.exit(1);
    }
    console.log("Cleared bnsentmix_samples.");
  }

  let startOffset = options.offset;
  if (options.resume) {
    const progress = await loadProgress();
    if (progress) {
      startOffset = progress.lastCompletedIndex;
      console.log(`Resuming after row index ${startOffset}.`);
    }
  }

  const sliceStart = startOffset;
  const sliceEnd =
    options.limit !== undefined
      ? Math.min(sliceStart + options.limit, allRows.length)
      : allRows.length;

  const rows = allRows.slice(sliceStart, sliceEnd);

  console.log(
    `Seeding BnSentMix rows ${sliceStart + 1}-${sliceEnd} of ${allRows.length} ...`
  );

  let totalSeeded = 0;
  let lastCompletedIndex = sliceStart;

  for (const row of rows) {
    const id = bnsentmixRowId(row.index);

    try {
      const embedding = await embedTextForSeed(row.text);

      const { error } = await supabase.from("bnsentmix_samples").upsert({
        id,
        text: row.text,
        sentiment: row.sentiment,
        embedding,
      });

      if (error) {
        console.error(`Failed ${id}:`, error.message);
        if (error.message.includes("1536 dimensions")) {
          console.error(
            "Run supabase/migrate-768.sql in the Supabase SQL Editor, then re-seed."
          );
        }
        break;
      }

      totalSeeded++;
      lastCompletedIndex = row.index;
      if (totalSeeded % 25 === 0 || totalSeeded === rows.length) {
        console.log(`Seeded ${totalSeeded}/${rows.length} (latest: ${id})`);
      }

      await saveProgress({
        lastCompletedIndex,
        totalSeeded,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed ${id}:`, message.slice(0, 200));

      if (
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.includes("embed_content_free_tier")
      ) {
        console.error("");
        console.error("Gemini embedding daily quota hit (free tier: 1,000 requests/day per project).");
        console.error(`Progress saved at row ${lastCompletedIndex}. Options:`);
        console.error("  1. Wait until quota resets (~24h), then: pnpm seed:bnsentmix -- --resume");
        console.error("  2. Add a second Google AI project key to .env.local:");
        console.error("     GEMINI_EMBEDDING_API_KEY=key2,key3   (comma-separated, separate projects)");
        console.error("  3. Enable billing on Google AI for higher limits");
        console.error("");
        console.error("~949 rows are already seeded — RAG works with partial data for your demo.");
      } else {
        console.error("Stopping. Re-run with --resume to continue.");
      }
      break;
    }

    if (options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  console.log(`Done. Seeded ${totalSeeded} rows in this run.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
