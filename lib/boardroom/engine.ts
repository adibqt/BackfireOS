/**
 * Boardroom debate engine — a framework-free, hand-rolled state machine.
 *
 * Why no agent framework: off-the-shelf orchestration libraries make hidden,
 * redundant model calls (planning, reflection, tool routers) that would instantly
 * exhaust a 30 RPM / 250-per-day budget. This engine instead makes EXACTLY one
 * model call per spoken turn. The shared `DebateContext` is the only memory; each
 * persona reads it, speaks, and appends its line, then the speaker pointer
 * advances. Rounds are hard-capped and an early-convergence heuristic halts the
 * loop the moment the room substantively agrees.
 *
 * Provider routing (degrades gracefully, never hard-fails the stream):
 *   Groq (streaming, preferred) → Gemini (streaming) → scripted mock.
 */
import type { AgentVerdict, CulturalStressMap } from "@/lib/agents/types";
import type { PersistedAi } from "@/lib/branches/types";
import { getMarket } from "@/lib/markets/catalog";
import {
  COMPOUND_MODEL,
  SCOUT_MODEL,
  groqJson,
  isGroqConfigured,
  streamGroqChat,
  type ChatMessage,
} from "@/lib/groq";
import {
  generateJson,
  generateTextStream,
  isGeminiConfigured,
} from "@/lib/gemini";
import {
  buildGroundingBlock,
  getPersona,
  renderTranscript,
  SPEAKING_ORDER,
} from "./personas";
import type {
  DebateContext,
  DebateDecision,
  DebateMessage,
  DebatePersona,
  DebateSynthesis,
} from "./types";

type Provider = "groq" | "gemini" | "mock";

export type EmitFn = (event: string, data: unknown) => void;

/** Hard ceiling on debate rounds — the primary 429 protection. */
const MAX_ROUNDS = Math.max(
  1,
  Math.min(4, Number(process.env.BOARDROOM_MAX_ROUNDS ?? 2))
);

function selectProvider(): Provider {
  if (isGroqConfigured()) return "groq";
  if (isGeminiConfigured()) return "gemini";
  return "mock";
}

/** Concrete Groq model id for a persona's logical model tag. */
function groqModelFor(persona: DebatePersona): string {
  return persona.model === "compound" ? COMPOUND_MODEL : SCOUT_MODEL;
}

/**
 * Condenses the red-team verdicts into a few grounding lines so debaters argue
 * about the real findings instead of a hallucinated campaign. Sorted hardest-hit
 * first so the most serious risk leads.
 */
export function buildRedTeamSummary(verdicts: AgentVerdict[]): string {
  if (!verdicts || verdicts.length === 0) return "";
  return [...verdicts]
    .sort((a, b) => b.severity - a.severity)
    .map(
      (v) =>
        `- ${v.agentName} (severity ${v.severity}/100): ${v.reasoning.trim()}`
    )
    .join("\n");
}

/** Worst-case severity across the panel — feeds the mock synthesis decision. */
export function maxSeverity(verdicts: AgentVerdict[]): number {
  return verdicts.reduce((max, v) => Math.max(max, v.severity), 0);
}

/**
 * Grounding summary for a Counterfactual Branching variant, built from that
 * branch's OWN persisted AI verdict (its scores + harshest critic) rather than
 * the campaign's original red-team. Lets the room argue the variant against the
 * findings that actually pertain to it. Returns "" when the branch carries no
 * usable verdict, so the caller can fall back to the campaign's findings.
 */
export function buildBranchRedTeamSummary(ai: PersistedAi): string {
  const lines: string[] = [];
  if (ai.topCritic) {
    lines.push(
      `- ${ai.topCritic.agentName} (severity ${ai.topCritic.severity}/100): ${ai.topCritic.reasoning.trim()}`
    );
    if (ai.topCritic.sampleAttack?.trim()) {
      lines.push(`  Likely attack line: "${ai.topCritic.sampleAttack.trim()}"`);
    }
  }
  const s = ai.scores;
  if (s) {
    lines.push(
      `- Panel scores for THIS variant — backfire ${s.backfireScore}/100, resonance ${s.resonance}/100, polarization ${s.polarization}/100, brand-safety drift ${s.drift}/100.`
    );
  }
  return lines.join("\n");
}

/** Worst-case severity from a branch's own verdict — feeds the mock synthesis. */
export function branchWorstSeverity(ai: PersistedAi): number {
  return ai.topCritic?.severity ?? ai.scores?.backfireScore ?? 0;
}

/**
 * Distils the cultural-stress map into a few grounding lines so the room can
 * argue how the slogan actually lands per market (Dhaka vs. Sylhet vs. rural)
 * instead of reacting to one global severity number. Sorted hardest-hit first,
 * capped so the prompt stays compact. Returns "" when no map is available.
 */
export function buildMarketSummary(
  stressMap: CulturalStressMap | undefined,
  limit = 4
): string {
  if (!stressMap?.markets?.length) return "";
  return [...stressMap.markets]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, limit)
    .map((m) => {
      const label = getMarket(m.marketId)?.label ?? m.marketId;
      const trigger = m.triggers[0]?.text?.trim();
      const triggerNote = trigger ? ` — flagged line: "${trigger}"` : "";
      return `- ${label} (stress ${m.severity}/100): ${m.summary.trim()}${triggerNote}`;
    })
    .join("\n");
}

/* ──────────────────────────────────────────────────────────────────
   Turn prompts
   ────────────────────────────────────────────────────────────────── */

/**
 * Appended to every turn for every persona. The agentic compound model (the
 * Activist) tends to drift into a written report — markdown headings, tables,
 * "---" dividers — which reads nothing like someone speaking in a live room.
 * This hard-pins the output to spoken prose so the transcript stays a debate.
 */
const SPOKEN_STYLE_RULE = `Speak out loud as if you are in the room: 2-4 short sentences of plain conversational prose. When you address another participant, call them only by their role — the Brand Manager, the Activist, the Journalist, or the Brand Purist — exactly as labelled in the transcript. Never invent a personal name for anyone in the room. This is dialogue, not a document — do NOT use any markdown formatting, headings, tables, bullet points, numbered lists, bold, or "---" dividers. No section titles, no "Result:" summaries. Just say your piece in flowing sentences.`;

/**
 * Belt-and-suspenders backstop for when a model ignores SPOKEN_STYLE_RULE and
 * still emits report-style markdown. Flattens the structural artifacts (headings,
 * table rules, dividers, list/bold markers) into plain prose so the saved
 * transcript and final bubble read as speech — without trying to reflow tables,
 * which would be lossy. Words are preserved; only the scaffolding is removed.
 */
function stripReportFormatting(text: string): string {
  const cleaned = text
    .split("\n")
    .map((line) => line.trim())
    // Drop horizontal rules ("---") and markdown table separator rows ("|---|:--|").
    .filter((line) => !/^[-_*\s]{3,}$/.test(line))
    .filter((line) => !/^\|?[\s:|-]+\|[\s:|-]*$/.test(line))
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, "") // heading markers
        .replace(/^[-*+]\s+/, "") // bullet markers
        .replace(/^\d+[.)]\s+/, "") // numbered-list markers
        .replace(/\|/g, " ") // collapse table pipes into spaces
        .replace(/\*\*|__|`/g, "") // bold / inline-code markers
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter((line) => line.length > 0)
    .join(" ");
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

/**
 * Hard length backstop. The agentic compound model (the Activist) routinely
 * ignores the "2-4 sentences" rule and emits a full essay; instructions alone do
 * not constrain it. This clamps any turn to the contract — the first few
 * sentences, within a character ceiling — so the transcript reads as a debate
 * line, not a report. Trims on a sentence boundary where possible so it never
 * cuts off mid-word.
 */
function clampToSpokenTurn(
  text: string,
  maxSentences = 4,
  maxChars = 650
): string {
  // Split into sentences, keeping their terminating punctuation.
  const sentences = text.match(/[^.!?]+[.!?]+(?:["')\]]+)?\s*|[^.!?]+$/g) ?? [
    text,
  ];
  let out = sentences.slice(0, maxSentences).join("").trim();

  if (out.length > maxChars) {
    const slice = out.slice(0, maxChars);
    const lastBoundary = Math.max(
      slice.lastIndexOf("."),
      slice.lastIndexOf("!"),
      slice.lastIndexOf("?")
    );
    // Prefer cutting at the last sentence end inside the limit; otherwise hard
    // cut and signal the truncation rather than leave a dangling clause.
    out =
      lastBoundary > maxChars * 0.5
        ? slice.slice(0, lastBoundary + 1).trim()
        : `${slice.trim()}…`;
  }
  return out;
}

function turnInstruction(personaName: string, round: number): string {
  if (round === 1) {
    return `It is round ${round}. Open your position as ${personaName}. Be specific to the campaign above.\n\n${SPOKEN_STYLE_RULE}`;
  }
  return `It is round ${round} — the rebuttal round. As ${personaName}, respond to what was just said. Sharpen or revise your position; do not simply repeat round 1.\n\n${SPOKEN_STYLE_RULE}`;
}

function buildTurnMessages(
  persona: DebatePersona,
  ctx: DebateContext,
  round: number
): ChatMessage[] {
  const grounding = buildGroundingBlock(ctx);
  const transcript = renderTranscript(ctx);
  return [
    { role: "system", content: persona.systemPrompt },
    {
      role: "user",
      content: `${grounding}\n\nDEBATE SO FAR:\n${transcript}\n\n${turnInstruction(persona.name, round)}`,
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────
   Streaming providers
   ────────────────────────────────────────────────────────────────── */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Streams one persona's turn through the active provider. Returns the full text.
 * On a live-provider error it throws — the caller decides whether to degrade the
 * whole debate to mock so the transcript still completes.
 */
async function streamTurn(
  provider: Provider,
  persona: DebatePersona,
  ctx: DebateContext,
  round: number,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const messages = buildTurnMessages(persona, ctx, round);

  if (provider === "groq") {
    // The agentic compound model burns part of its budget on internal tool
    // calls; a tight cap can leave nothing for the visible answer (it returns an
    // empty completion). Give it more headroom than the fast scout personas so it
    // actually emits a spoken turn. The spoken-style rule keeps the prose short.
    const maxTokens = persona.model === "compound" ? 512 : 320;
    return streamGroqChat(messages, groqModelFor(persona), onToken, {
      temperature: 0.85,
      maxTokens,
      signal,
    });
  }

  if (provider === "gemini") {
    return generateTextStream(
      messages[1].content,
      onToken,
      persona.systemPrompt
    );
  }

  return streamMockTurn(persona, ctx, round, onToken, signal);
}

/**
 * Scripted fallback turn used when no model is configured. Produces a plausible,
 * campaign-specific line and types it out word-by-word so the live transcript
 * still feels alive in demo mode.
 */
async function streamMockTurn(
  persona: DebatePersona,
  ctx: DebateContext,
  round: number,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const slogan = ctx.slogan || "this campaign";
  const lines: Record<string, [string, string]> = {
    brand_manager: [
      `Look, "${slogan}" tested well and it's on-brand. The upside on reach is real — let's not talk ourselves out of a winner.`,
      `I hear the concern, but we can add a disclaimer and tighten the copy without gutting the idea. The core of "${slogan}" still ships.`,
    ],
    activist: [
      `My problem is concrete: the line "${slogan}" reads as a promise this brand cannot keep, and that's exactly the kind of claim regulators flag. Who protects the customer here?`,
      `A disclaimer doesn't undo the harm — it just buries it in fine print. Until the actual claim changes, "${slogan}" stays dangerous.`,
    ],
    journalist: [
      `Here's my headline: "Brand says ${slogan} — customers say otherwise." One unhappy buyer and that spin writes itself.`,
      `The Brand Manager keeps saying "tested well." Tested by whom? That's the line I'd be calling to verify before you launch.`,
    ],
    brand_purist: [
      `Set regulation aside — does "${slogan}" even sound like us? It pivots the tone away from what the brand has always stood for.`,
      `If we're bolting on disclaimers to make it safe, that's a tell. A campaign that needs defending this hard isn't on-brand yet.`,
    ],
  };
  const pair = lines[persona.id] ?? [
    `${persona.name} weighs in on "${slogan}".`,
    `${persona.name} holds the line on "${slogan}".`,
  ];
  const text = pair[Math.min(round - 1, 1)];

  // Type it out: emit word chunks with a small delay for the live effect.
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) break;
    onToken((i === 0 ? "" : " ") + words[i]);
    await sleep(28);
  }
  return text;
}

/* ──────────────────────────────────────────────────────────────────
   Convergence — lightweight, no extra model call
   ────────────────────────────────────────────────────────────────── */

const CONCESSION_SIGNALS = [
  "agree",
  "fair point",
  "fair enough",
  "you're right",
  "concede",
  "acceptable",
  "good point",
  "i can live with",
  "that works",
  "with that change",
  "revised",
  "no objection",
  "on board",
];

/**
 * Heuristic convergence check run after each completed round. Returns true when
 * the adversarial voices (Activist, Journalist) AND the defending voices both
 * show conciliatory language in the round just finished — i.e. the room has
 * substantively landed and further rounds would only burn quota.
 */
function roundConverged(roundMessages: DebateMessage[]): boolean {
  if (roundMessages.length < SPEAKING_ORDER.length) return false;

  const hasSignal = (id: string) => {
    const msg = roundMessages.find((m) => m.speakerId === id);
    if (!msg) return false;
    const text = msg.content.toLowerCase();
    return CONCESSION_SIGNALS.some((s) => text.includes(s));
  };

  // Convergence requires the chief adversary to soften and at least one other
  // voice to meet it — a single polite word from one side is not agreement.
  const activistSoftened = hasSignal("activist");
  const othersSoftened =
    [hasSignal("brand_manager"), hasSignal("journalist"), hasSignal("brand_purist")].filter(
      Boolean
    ).length >= 1;

  return activistSoftened && othersSoftened;
}

/* ──────────────────────────────────────────────────────────────────
   Synthesis — the decision a greenlighter reads
   ────────────────────────────────────────────────────────────────── */

function isDecision(value: unknown): value is DebateDecision {
  return value === "greenlight" || value === "revise" || value === "kill";
}

/**
 * The decision the raw red-team severity alone would imply — the same thresholds
 * the heuristic fallback uses. Lets us sanity-check the AI chair against the
 * numbers without forcing it to agree with them.
 */
function severityImpliedDecision(worstSeverity: number): DebateDecision {
  if (worstSeverity >= 75) return "kill";
  if (worstSeverity >= 45) return "revise";
  return "greenlight";
}

/** Decisions ranked on a launch-risk axis so we can measure how far apart two are. */
const DECISION_RANK: Record<DebateDecision, number> = {
  greenlight: 0,
  revise: 1,
  kill: 2,
};

/**
 * Reconciles the chair's self-reported confidence with the quantitative red-team
 * severity. The chair may legitimately disagree with the raw score — the debate
 * can surface risks the score missed, or defuse ones it flagged — so we never
 * override its decision. But the further that verdict drifts from what the
 * numbers imply, the less certain we let it claim to be. This stops a clear-cut,
 * low-backfire campaign from being stamped with a falsely shaky number, and a
 * contrarian verdict from being over-sold. The caps stay deliberately loose: the
 * chair is now instructed to override an unsubstantiated score on the slogan's
 * merits, and a well-reasoned override should not read as a coin flip.
 */
function boundConfidence(
  decision: DebateDecision,
  confidence: number,
  worstSeverity: number
): number {
  const distance = Math.abs(
    DECISION_RANK[decision] -
      DECISION_RANK[severityImpliedDecision(worstSeverity)]
  );
  // Agreement with the score: a clear-cut call should not read as a coin flip.
  if (distance === 0) return Math.max(confidence, 65);
  // One step off (e.g. score says "revise", room says "ship"): trim the certainty.
  if (distance === 1) return Math.min(confidence, 78);
  // Direct contradiction (greenlight vs. kill): a deliberate override of the data.
  // Still cap it — an override carries more doubt — but don't force a coin flip.
  return Math.min(confidence, 62);
}

function buildSynthesisPrompt(ctx: DebateContext, worstSeverity: number): string {
  return `${buildGroundingBlock(ctx)}

FULL DEBATE TRANSCRIPT:
${renderTranscript(ctx)}

You are the neutral chair of this boardroom. Read the debate and decide whether the campaign should launch. Weigh the Activist's harm/regulatory concerns and the Journalist's exposure risk heavily — a brand crisis costs more than a delayed launch.

Judge the ACTUAL slogan above, on its own words: what it claims, the audience it targets, and how it reads in ${ctx.region || "Bangladesh"} across the markets listed. Decide from the substance of the debate, not from a number.

The harshest red-team severity on record is ${worstSeverity}/100 (0 = harmless, 100 = certain crisis). Treat this as ONE critic's claim to be tested, not a verdict to obey. Ask: did the debate name a concrete, slogan-specific risk that justifies that score? If yes, let it pull you toward "revise" or "kill". If the score is high but no one could point to an actual problem in THIS slogan for THIS audience — e.g. a warm, generic, inoffensive message — then greenlight and say plainly that the severity was not substantiated. Never kill a slogan you cannot fault in concrete terms.

Return ONLY a JSON object:
{
  "decision": "greenlight" | "revise" | "kill",
  "confidence": <integer 0-100>,
  "summary": "<2-4 sentences: where the room landed and why>",
  "conditions": ["<concrete change required before launch>", "..."]
}
- "decision": "greenlight" = ship as-is (conditions may be empty); "revise" = ship only after the listed fixes; "kill" = the risk is not fixable by tweaks.
- "confidence" is your certainty in THIS recommendation — NOT the campaign's safety. Be most confident (80-95) when the debate clearly resolved one way; be least confident (40-60) when the room stayed genuinely split. A verdict that contradicts the ${worstSeverity}/100 severity should carry lower confidence.`;
}

interface RawSynthesis {
  decision?: unknown;
  confidence?: unknown;
  summary?: unknown;
  conditions?: unknown;
}

async function synthesize(
  provider: Provider,
  ctx: DebateContext,
  worstSeverity: number,
  signal?: AbortSignal
): Promise<DebateSynthesis> {
  if (provider === "mock") {
    return mockSynthesis(worstSeverity);
  }

  const prompt = buildSynthesisPrompt(ctx, worstSeverity);
  try {
    let raw: RawSynthesis;

    if (provider === "groq") {
      raw = await groqJson<RawSynthesis>(
        [
          {
            role: "system",
            content:
              "You are a neutral, decisive boardroom chair. Respond only with the requested JSON.",
          },
          { role: "user", content: prompt },
        ],
        SCOUT_MODEL,
        signal
      );
    } else {
      raw = await generateJson<RawSynthesis>(prompt);
    }

    const decision = isDecision(raw.decision) ? raw.decision : "revise";
    const rawConfidence =
      typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
        ? Math.max(0, Math.min(100, Math.round(raw.confidence)))
        : 60;
    // Anchor the chair's certainty to the red-team severity so it can't claim a
    // confident verdict that the numbers flatly contradict (or under-sell a clear one).
    const confidence = boundConfidence(decision, rawConfidence, worstSeverity);
    const summary =
      typeof raw.summary === "string" && raw.summary.trim().length > 0
        ? raw.summary.trim()
        : "The room reviewed the campaign and its risks.";
    const conditions = Array.isArray(raw.conditions)
      ? raw.conditions
          .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
          .slice(0, 6)
      : [];

    return { decision, confidence, summary, conditions, source: "ai" };
  } catch (error) {
    console.error(
      "Boardroom synthesis failed — using heuristic decision:",
      error instanceof Error ? error.message : error
    );
    return mockSynthesis(worstSeverity);
  }
}

/** Heuristic decision derived from the worst red-team severity. */
function mockSynthesis(worstSeverity: number): DebateSynthesis {
  let decision: DebateDecision;
  let confidence: number;
  let summary: string;
  const conditions: string[] = [];

  if (worstSeverity >= 75) {
    decision = "kill";
    // The further past the kill line, the surer the call.
    confidence = Math.min(92, 78 + Math.round((worstSeverity - 75) / 25 * 14));
    summary =
      "The room could not resolve a serious, named risk in the campaign. The Activist's and Journalist's objections outweighed the commercial upside.";
    conditions.push("Reframe the core claim — the current angle is not salvageable by tweaks.");
  } else if (worstSeverity >= 45) {
    decision = "revise";
    // Mid-band: a genuine judgement call, so the heuristic stays modest.
    confidence = 58;
    summary =
      "The campaign has a workable core but carries real risks the room wants addressed before launch.";
    conditions.push("Tighten the slogan so it makes no claim the brand cannot back up.");
    conditions.push("Add a compliance review for any price/scarcity or sensitivity language.");
  } else {
    decision = "greenlight";
    // The lower the severity, the cleaner the greenlight.
    confidence = Math.min(90, 70 + Math.round((45 - worstSeverity) / 45 * 20));
    summary =
      "No nameable crisis-level risk surfaced. The room is comfortable launching, with normal monitoring.";
  }

  return { decision, confidence, summary, conditions, source: "mock" };
}

/* ──────────────────────────────────────────────────────────────────
   The debate loop
   ────────────────────────────────────────────────────────────────── */

export interface RunDebateResult {
  messages: DebateMessage[];
  synthesis: DebateSynthesis;
  rounds: number;
  converged: boolean;
  degraded: boolean;
}

/**
 * Drives the full debate, emitting SSE events as it goes:
 *   debate_start → (speaker_start → token* → speaker_end)* → round_end* →
 *   synthesis → complete
 *
 * `emit` pushes an event to the client; `signal` aborts a turn when the client
 * disconnects. Returns the assembled transcript for persistence.
 */
export async function runDebate(
  ctx: DebateContext,
  worstSeverity: number,
  emit: EmitFn,
  signal?: AbortSignal
): Promise<RunDebateResult> {
  let provider = selectProvider();
  let degraded = provider === "mock";
  let converged = false;
  let roundsRun = 0;

  emit("debate_start", {
    personas: SPEAKING_ORDER.map((id) => {
      const p = getPersona(id);
      return { id: p.id, name: p.name, role: p.role, initials: p.initials, model: p.model };
    }),
    maxRounds: MAX_ROUNDS,
    slogan: ctx.slogan,
    brandName: ctx.brandName,
    provider,
  });

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    roundsRun = round;
    const roundMessages: DebateMessage[] = [];

    for (const personaId of SPEAKING_ORDER) {
      if (signal?.aborted) break;
      const persona = getPersona(personaId);

      emit("speaker_start", {
        speakerId: persona.id,
        speakerName: persona.name,
        role: persona.role,
        model: persona.model,
        round,
      });

      let content = "";
      const onToken = (token: string) => {
        content += token;
        emit("token", { speakerId: persona.id, token });
      };

      try {
        content = await streamTurn(provider, persona, ctx, round, onToken, signal);
      } catch (error) {
        // A live-provider failure degrades the rest of the debate to mock rather
        // than killing the stream — the transcript still resolves.
        console.error(
          `Boardroom turn (${persona.id}) failed on ${provider}; degrading to mock:`,
          error instanceof Error ? error.message : error
        );
        provider = "mock";
        degraded = true;
        content = await streamMockTurn(persona, ctx, round, onToken, signal);
      }

      // The agentic compound model (the Activist) intermittently returns a 200
      // with no text on the longer rebuttal round — it spends its budget on
      // internal tool calls and emits an empty completion. Rather than dropping
      // straight to the canned scripted line (which then repeats across every
      // campaign), retry the SAME turn on the live scout model so the room still
      // gets a real, varied argument. Only if that also comes back empty do we
      // fall back to the scripted line.
      if (
        !signal?.aborted &&
        content.trim().length === 0 &&
        provider === "groq"
      ) {
        console.warn(
          `Boardroom turn (${persona.id}, round ${round}) returned empty on compound; retrying live on scout.`
        );
        try {
          const messages = buildTurnMessages(persona, ctx, round);
          content = await streamGroqChat(messages, SCOUT_MODEL, onToken, {
            temperature: 0.85,
            maxTokens: 320,
            signal,
          });
        } catch (error) {
          console.error(
            `Boardroom scout retry (${persona.id}, round ${round}) failed:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      // Last resort: every persona must speak, so if no live model produced text
      // (no provider configured, or the retry also failed), use the scripted line.
      if (!signal?.aborted && content.trim().length === 0) {
        console.warn(
          `Boardroom turn (${persona.id}, round ${round}) still empty on ${provider}; using scripted fallback.`
        );
        degraded = true;
        content = await streamMockTurn(persona, ctx, round, onToken, signal);
      }

      const message: DebateMessage = {
        id: crypto.randomUUID(),
        speakerId: persona.id,
        speakerName: persona.name,
        model: persona.model,
        content: clampToSpokenTurn(stripReportFormatting(content)),
        round,
      };
      ctx.messages.push(message);
      roundMessages.push(message);
      emit("speaker_end", { message });
    }

    if (signal?.aborted) break;

    // Early-convergence check — only meaningful after the rebuttal round, so the
    // room has actually had a chance to respond to each other.
    converged = round >= 2 && roundConverged(roundMessages);
    emit("round_end", { round, converged });
    if (converged) break;
  }

  const synthesis = await synthesize(provider, ctx, worstSeverity, signal);
  emit("synthesis", synthesis);

  return {
    messages: ctx.messages,
    synthesis,
    rounds: roundsRun,
    converged,
    degraded,
  };
}
