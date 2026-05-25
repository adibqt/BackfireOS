/**
 * BnSentMix — real Banglish sentiment corpus from Hugging Face.
 * @see https://huggingface.co/datasets/aplycaebous/BnSentMix
 * @see https://arxiv.org/abs/2408.08964
 */

export const BNSENTMIX_HF_DATASET_URL =
  "https://huggingface.co/datasets/aplycaebous/BnSentMix/resolve/main/dataset.csv";

export const BNSENTMIX_CSV_PATH = "data/bnsentmix/dataset.csv";

export type BnSentMixRow = {
  index: number;
  text: string;
  label: number;
  sentiment: string;
};

/** Hugging Face BnSentMix CSV uses 0–3 (positive, negative, neutral, mixed). */
export function labelToSentiment(label: number): string {
  return (
    {
      0: "positive",
      1: "negative",
      2: "neutral",
      3: "mixed",
    }[label] ?? "neutral"
  );
}

export function bnsentmixRowId(index: number): string {
  return `hf-${String(index).padStart(5, "0")}`;
}

/** Parse Hugging Face dataset.csv (columns: Sentence, Label). */
export function parseBnSentMixCsv(csv: string): BnSentMixRow[] {
  const rows: BnSentMixRow[] = [];
  let dataRowIndex = 0;

  for (const fields of parseCsvRecords(csv)) {
    if (fields.length < 2) continue;

    if (dataRowIndex === 0) {
      const header = fields[0]?.toLowerCase();
      if (header === "sentence" || header === "text") {
        continue;
      }
    }

    dataRowIndex++;
    const text = fields[0]?.trim();
    const label = Number.parseInt(fields[fields.length - 1] ?? "", 10);

    if (!text || Number.isNaN(label)) continue;

    rows.push({
      index: dataRowIndex,
      text,
      label,
      sentiment: labelToSentiment(label),
    });
  }

  return rows;
}

function* parseCsvRecords(csv: string): Generator<string[]> {
  let field = "";
  let fields: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else if (char === "\r" && next === "\n") {
      fields.push(field);
      yield fields;
      fields = [];
      field = "";
      i++;
    } else if (char === "\n") {
      fields.push(field);
      yield fields;
      fields = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || fields.length > 0) {
    fields.push(field);
    yield fields;
  }
}
