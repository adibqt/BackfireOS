/**
 * Pre-Mortem engine — a framework-free generation pipeline.
 *
 * Mirrors the Boardroom engine's philosophy: no agent framework, exactly the
 * model calls we need, and graceful degradation to a scripted mock so the
 * feature always completes (demo builds, missing key, model unavailable).
 *
 * The document is streamed as Markdown so it types out live, then parsed into a
 * structured `PreMortemReport` for persistence and the final render. One model
 * call produces the whole obituary.
 *
 * Provider: Gemini `gemini-3.5-flash` (streaming) → scripted mock.
 */
import {
  generateTextStream,
  isGeminiConfigured,
  TEXT_MODEL,
} from "@/lib/gemini";
import { FAILURE_LABELS, strategyFraming } from "./strategies";
import type {
  FailureType,
  PreMortemContext,
  PreMortemReport,
  PreMortemSection,
} from "./types";

type Provider = "gemini" | "mock";

export type EmitFn = (event: string, data: unknown) => void;

/* ──────────────────────────────────────────────────────────────────
   Forward date — the report is dated ~6 months past the run.
   ────────────────────────────────────────────────────────────────── */

const MONTHS_AHEAD = 6;

/** Run date + 6 months, formatted "14 December 2026". */
export function forwardPublishDate(runCreatedAt: string): string {
  const base = new Date(runCreatedAt);
  const d = Number.isNaN(base.getTime()) ? new Date() : base;
  const future = new Date(d);
  future.setMonth(future.getMonth() + MONTHS_AHEAD);
  return future.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ──────────────────────────────────────────────────────────────────
   Prompt
   ────────────────────────────────────────────────────────────────── */

const SECTION_HEADINGS = [
  "The apology we were forced to publish",
  "How it unraveled",
  "Root cause",
  "Blast radius",
  "Regulatory & external exposure",
  "What we should have done",
] as const;

/** Heading that maps to the `apology` field rather than `sections[]`. */
const APOLOGY_HEADING = SECTION_HEADINGS[0];

const SYSTEM_INSTRUCTION = `You are a crisis-communications writer drafting a brutally honest internal post-mortem for a Bangladeshi brand. You write the document AS IF the worst outcome already happened — past tense, six months on. You do not hedge, you do not reassure, you do not soften. You name the specific copy that caused the harm and you let the consequences land. Your voice is the sober, slightly haunted voice of a team that shipped something it now regrets.`;

function buildPrompt(ctx: PreMortemContext): string {
  const headingList = SECTION_HEADINGS.map((h) => `## ${h}`).join("\n");
  return `A campaign was simulated and its worst plausible outcome is below. Write the post-mortem the brand would have been FORCED to publish six months later, assuming this outcome came true.

CAMPAIGN ON TRIAL
- Slogan: "${ctx.slogan}"
- Brand: ${ctx.brandName || "the brand"}
- Stated brand values: ${ctx.brandValues || "Not specified"}
- Brief: ${ctx.brief || "Not specified"}
- Visual: ${ctx.imageDescription || "No visual provided"}

THE WORST PLAUSIBLE OUTCOME (from the red-team simulation)
- Backfire Score: ${ctx.backfireScore}/100
- Harshest critic: ${ctx.topCriticName} (severity ${ctx.worstSeverity}/100)
- Red-team findings (hardest-hit first):
${ctx.redTeamSummary || "- No specific findings; reason from the slogan itself."}
${ctx.culturalFlags ? `- Cultural stress flags:\n${ctx.culturalFlags}` : ""}

${strategyFraming(ctx)}

WRITE THE DOCUMENT in GitHub-flavored Markdown, dated ${ctx.publishDate}, using EXACTLY this structure and these headings in this order:

# <the damning headline that actually broke — a real, specific line a newsroom would run>
*<one-sentence standfirst summarizing the fallout>*

${headingList}

Rules:
- The first "## ${APOLOGY_HEADING}" section is the actual public apology paragraph, written in the brand's first-person voice ("We at ${ctx.brandName || "the brand"}…"). 3-5 sentences. It must reference the offending campaign specifically.
- "## How it unraveled" is a short, dated timeline (use a bullet per beat: a date, then what happened).
- "## What we should have done" is 3-5 concrete corrective actions, as a bulleted list.
- Quote the actual slogan and red-team findings — never invent a different campaign.
- Be specific to Bangladesh and to this exact campaign. No generic filler.
- Output ONLY the Markdown document. No preamble, no commentary, no code fences.`;
}

/* ──────────────────────────────────────────────────────────────────
   Parsing — Markdown → structured report
   ────────────────────────────────────────────────────────────────── */

function stripEmphasis(line: string): string {
  return line
    .replace(/^\s*[*_]{1,2}/, "")
    .replace(/[*_]{1,2}\s*$/, "")
    .trim();
}

/**
 * Splits the streamed Markdown into a structured report. The first `# ` line is
 * the headline; the first emphasized line beneath it is the dek; each `## `
 * block becomes a section, with the apology section lifted into its own field.
 * Resilient to a model that drifts from the template: missing pieces fall back
 * to sensible defaults rather than throwing.
 */
export function parseReport(
  markdown: string,
  ctx: PreMortemContext,
  source: "ai" | "mock",
  degraded: boolean
): PreMortemReport {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  let headline = "";
  let dek = "";
  const sections: PreMortemSection[] = [];
  let apology = "";

  let current: { heading: string; body: string[] } | null = null;
  let sawHeadline = false;

  const flush = () => {
    if (!current) return;
    const body = current.body.join("\n").trim();
    if (current.heading.toLowerCase().includes("apolog")) {
      apology = body;
    } else {
      sections.push({ heading: current.heading, body });
    }
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!sawHeadline && /^#\s+/.test(line)) {
      headline = line.replace(/^#\s+/, "").trim();
      sawHeadline = true;
      continue;
    }
    if (/^##\s+/.test(line)) {
      flush();
      current = { heading: line.replace(/^##\s+/, "").trim(), body: [] };
      continue;
    }
    if (current) {
      current.body.push(raw);
      continue;
    }
    // Lede region (between headline and first ## ): first emphasized or non-empty
    // line becomes the dek.
    if (sawHeadline && !dek && line.trim().length > 0) {
      dek = stripEmphasis(line);
    }
  }
  flush();

  if (!headline) headline = `When "${ctx.slogan}" went wrong`;
  if (!dek) {
    dek = `A ${FAILURE_LABELS[ctx.failureType].toLowerCase()} the team was warned about.`;
  }

  return {
    id: crypto.randomUUID(),
    runId: "",
    iteration: 0,
    campaignSlogan: ctx.slogan,
    failureType: ctx.failureType,
    publishDate: ctx.publishDate,
    headline,
    dek,
    apology,
    sections,
    worstSeverity: ctx.worstSeverity,
    topCriticName: ctx.topCriticName,
    source,
    degraded,
    createdAt: new Date().toISOString(),
  };
}

/* ──────────────────────────────────────────────────────────────────
   Mock — scripted, campaign-specific document typed out word by word
   ────────────────────────────────────────────────────────────────── */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockMarkdown(ctx: PreMortemContext): string {
  const brand = ctx.brandName || "The brand";
  const label = FAILURE_LABELS[ctx.failureType];
  return `# "${ctx.slogan}" — the line that cost us the quarter

*A ${label.toLowerCase()} the red team flagged at severity ${ctx.worstSeverity}, shipped anyway, and detonated within weeks.*

## ${APOLOGY_HEADING}
We at ${brand} owe our customers a direct apology. Our campaign "${ctx.slogan}" did not live up to the standard you hold us to, and the harm our harshest reviewer — ${ctx.topCriticName} — warned us about became real. We were told, we had the score in front of us, and we launched regardless. That decision was ours, and the consequences were yours to absorb. We are sorry.

## How it unraveled
- Week 1 — the campaign launched on schedule despite a Backfire Score of ${ctx.backfireScore}/100.
- Week 2 — the exact concern ${ctx.topCriticName} raised surfaced publicly and spread faster than we could respond.
- Week 4 — the screenshot outlived the campaign; the slogan became shorthand for everything we said we were not.

## Root cause
The failure was not the slogan alone — it was that we treated "${ctx.slogan}" as a creative win and the red-team severity of ${ctx.worstSeverity}/100 as a formality to override. We optimized for launch date over the one finding that mattered.

## Blast radius
Trust did not degrade gradually; it broke. The people the campaign was meant to reach are the ones who felt it most, and winning them back will cost far more than the launch ever earned.

## Regulatory & external exposure
The campaign drew scrutiny under the standards a brand of our size is held to in Bangladesh, including the Essential Commodities Act 2025 and the Digital Commerce Guidelines. We spent the following months explaining a decision we should never have made.

## What we should have done
- Treated a severity-${ctx.worstSeverity} finding as a launch blocker, not a note.
- Rewritten "${ctx.slogan}" before a single rupee of media spend.
- Pressure-tested the line with the exact audience it named.
- Given the red team the authority to halt a launch, not just to comment on it.`;
}

async function streamMock(
  ctx: PreMortemContext,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const text = mockMarkdown(ctx);
  // Type it out token-ish (by whitespace) so the document feels alive in demo mode.
  const chunks = text.split(/(\s+)/);
  for (const chunk of chunks) {
    if (signal?.aborted) break;
    onToken(chunk);
    if (chunk.trim().length > 0) await sleep(12);
  }
  return text;
}

/* ──────────────────────────────────────────────────────────────────
   The generation
   ────────────────────────────────────────────────────────────────── */

export interface RunPreMortemResult {
  report: PreMortemReport;
}

function selectProvider(): Provider {
  return isGeminiConfigured() ? "gemini" : "mock";
}

/**
 * Generates the pre-mortem, emitting SSE events as it goes:
 *   premortem_start → token* → complete
 *
 * Streams Markdown token-by-token, then parses it into the structured report.
 * A live-model failure degrades to the scripted mock rather than killing the
 * stream — the document always resolves.
 */
export async function runPreMortem(
  ctx: PreMortemContext,
  emit: EmitFn,
  signal?: AbortSignal
): Promise<RunPreMortemResult> {
  let provider = selectProvider();
  let degraded = provider === "mock";

  emit("premortem_start", {
    failureType: ctx.failureType,
    failureLabel: FAILURE_LABELS[ctx.failureType],
    publishDate: ctx.publishDate,
    slogan: ctx.slogan,
    brandName: ctx.brandName,
    worstSeverity: ctx.worstSeverity,
    topCriticName: ctx.topCriticName,
    backfireScore: ctx.backfireScore,
    provider,
  });

  const onToken = (token: string) => {
    if (token) emit("token", { token });
  };

  let markdown = "";

  if (provider === "gemini") {
    try {
      markdown = await generateTextStream(
        buildPrompt(ctx),
        onToken,
        SYSTEM_INSTRUCTION,
        TEXT_MODEL
      );
    } catch (error) {
      console.error(
        "Pre-mortem generation failed on Gemini; degrading to scripted mock:",
        error instanceof Error ? error.message : error
      );
      provider = "mock";
      degraded = true;
    }
  }

  // Empty or unusable model output also degrades to the mock so the document
  // never renders blank.
  if (provider === "mock" || markdown.trim().length === 0) {
    if (!degraded && markdown.trim().length === 0) degraded = true;
    markdown = await streamMock(ctx, onToken, signal);
  }

  const report = parseReport(
    markdown,
    ctx,
    degraded ? "mock" : "ai",
    degraded
  );

  return { report };
}

export { FAILURE_LABELS };
export type { FailureType };
