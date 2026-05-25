/**
 * Download BnSentMix dataset.csv from Hugging Face.
 * Usage: pnpm download:bnsentmix
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  BNSENTMIX_CSV_PATH,
  BNSENTMIX_HF_DATASET_URL,
  parseBnSentMixCsv,
} from "../lib/bnsentmix";

async function main() {
  console.log(`Downloading from ${BNSENTMIX_HF_DATASET_URL} ...`);

  const response = await fetch(BNSENTMIX_HF_DATASET_URL);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const csv = await response.text();
  const dir = path.dirname(BNSENTMIX_CSV_PATH);
  await mkdir(dir, { recursive: true });
  await writeFile(BNSENTMIX_CSV_PATH, csv, "utf8");

  const rows = parseBnSentMixCsv(csv);
  console.log(`Saved ${BNSENTMIX_CSV_PATH} (${rows.length} rows).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
