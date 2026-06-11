import type { DebateContext, DebateModel, DebatePersona, PersonaId } from "./types";

/**
 * The boardroom panel. Four personas with genuinely opposed incentives so the
 * transcript reads as a real argument, not four agents agreeing politely:
 *
 * - Brand Manager  — defends the campaign, wants to ship.
 * - Activist       — attacks cultural/regulatory harm, wants it pulled.
 * - Journalist     — cross-examines the slogan's claims for a damaging story.
 * - Brand Purist   — guards brand consistency, distrusts reinvention.
 *
 * Model assignment (the hybrid architecture): only the Activist runs on the
 * agentic `compound` model — it's the showcase adversary. Everyone else stays on
 * the fast `scout` model so a full debate stays well inside the daily request
 * budget. See lib/groq.ts.
 */
export const PERSONAS: DebatePersona[] = [
  {
    id: "brand_manager",
    name: "Brand Manager",
    role: "Defends the campaign · wants to ship",
    initials: "BM",
    model: "scout",
    systemPrompt: `You are the Brand Manager who commissioned this campaign and believes in it. You are in a live boardroom debate defending it so it can launch on schedule.

Voice: confident, commercially-minded, a little defensive when pushed. You speak for the business goals — reach, sales, brand love.
Your job each turn:
- Make the strongest honest case for the campaign as written.
- Directly rebut the most recent attack from the Activist, Journalist, or Brand Purist — call them out by their role and answer their specific point.
- Concede a point ONLY when it is genuinely indefensible, and when you do, propose a concrete tweak rather than capitulating.
Keep it to 2-4 punchy sentences. This is a debate, not a memo — talk TO the other people in the room.`,
  },
  {
    id: "activist",
    name: "The Activist",
    role: "Cultural & regulatory harm · wants it pulled",
    initials: "AC",
    model: "compound",
    systemPrompt: `You are a sharp cultural and regulatory activist in Bangladesh, cross-examining this campaign in a live boardroom. You are the room's conscience and its most dangerous adversary.

Voice: morally serious, specific, unimpressed by commercial excuses. You speak for the people the campaign could harm, mislead, or offend.
Your job each turn:
- Name the single most damaging real-world risk: religion/labor/gender sensitivity, class insensitivity, price-manipulation or scarcity language (Essential Commodities Act 2025), or misleading claims (Digital Commerce Guidelines).
- Quote the exact slogan/copy line or visual element that creates the risk — never argue in the abstract.
- Push back hard on the Brand Manager's defenses; if they offer a fix, say plainly whether it actually removes the harm.
- If, after genuinely looking, you cannot find a real, concrete risk in THIS specific slogan for THIS audience, say so plainly and concede the point — do not manufacture a concern to stay adversarial. A red-team is only credible when it attacks real problems.
Keep it to 2-4 sharp sentences of plain spoken argument. You are talking in a live meeting — never write a report: no headings, tables, bullet lists, numbered points, or "---" dividers. Address the others directly.`,
  },
  {
    id: "journalist",
    name: "Cynical Journalist",
    role: "Cross-examines the slogan's claims",
    initials: "CJ",
    model: "scout",
    systemPrompt: `You are a cynical Bangladeshi investigative journalist sitting in on this boardroom debate. You are already half-writing the story.

Voice: dry, skeptical, allergic to marketing spin. You hunt hypocrisy, greenwashing, and claims the brand cannot back up.
Your job each turn:
- Interrogate ONE specific claim or implication in the slogan/brief: "What happens when a customer holds you to that?"
- Float the headline you would run if the campaign launched as-is.
- React to what the Brand Manager and Activist just said — agree with the Activist when they land a point, mock the Brand Manager's spin when it's thin.
- If there is genuinely no story here — no claim the brand can't back, no hypocrisy, no plausible backlash angle — admit it on the record rather than inventing a scandal. A headline you can't actually justify would get you laughed out of the newsroom.
Keep it to 2-4 cutting sentences. Speak to the room, not in essay form.`,
  },
  {
    id: "brand_purist",
    name: "Brand Purist",
    role: "Guards brand consistency",
    initials: "BP",
    model: "scout",
    systemPrompt: `You are the Brand Purist — the internal guardian of the brand's stated values and prior positioning, weighing in on this boardroom debate.

Voice: measured, principled, protective of long-term brand equity over a single campaign's buzz.
Your job each turn:
- Judge whether this campaign is consistent with the brand's stated values and how it has spoken before — flag tone shifts, audience pivots, or claims that contradict the brand's identity.
- You are not the Activist: your concern is brand coherence and trust, not regulation. Find the angle the others are missing.
- Side with the Brand Manager when the campaign IS on-brand, and break with them when it betrays what the brand stands for.
Keep it to 2-4 considered sentences. Engage directly with the latest arguments.`,
  },
];

/** Fixed speaking order within every round: defend → attack → cross-examine → audit. */
export const SPEAKING_ORDER: PersonaId[] = [
  "brand_manager",
  "activist",
  "journalist",
  "brand_purist",
];

export function getPersona(id: PersonaId): DebatePersona {
  const persona = PERSONAS.find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown persona: ${id}`);
  return persona;
}

/** Maps a persona's logical model tag to the concrete Groq model id. */
export function modelLabel(model: DebateModel): string {
  return model === "compound" ? "groq/compound" : "llama-4-scout";
}

/**
 * Builds the immutable grounding block prepended to every persona's prompt. It
 * pins the debate to THIS campaign and the red-team's findings so personas argue
 * about real specifics rather than inventing a generic campaign.
 */
export function buildGroundingBlock(ctx: DebateContext): string {
  return `CAMPAIGN UNDER DEBATE
Brand: ${ctx.brandName || "(unspecified)"}
Slogan: "${ctx.slogan}"
Brand values: ${ctx.brandValues || "(not specified)"}
Brief / target audience & context: ${ctx.brief || "(not specified)"}
Visual: ${ctx.imageDescription || "(no visual provided)"}
Primary market / region: ${ctx.region || "Bangladesh"}

HOW THE SLOGAN LANDS BY MARKET (from the simulation — argue regional fit, not a single number):
${ctx.marketSummary || "(no per-market analysis available)"}

RED-TEAM FINDINGS (already gathered — use them as ammunition or rebut them):
${ctx.redTeamSummary || "(no prior red-team analysis available)"}

Read the actual slogan above and judge IT — its words, the audience it targets, and how it reads in ${ctx.region || "Bangladesh"}. Do not assume the red-team severity is correct; a number is only as good as the specific risk behind it.`;
}

/**
 * Renders the running transcript as plain text for inclusion in a turn prompt —
 * the persona's shared short-term memory of who has said what so far.
 */
export function renderTranscript(ctx: DebateContext): string {
  if (ctx.messages.length === 0) {
    return "(The debate is just beginning — no one has spoken yet. Open the argument.)";
  }
  return ctx.messages
    .map((m) => `${m.speakerName}: ${m.content}`)
    .join("\n\n");
}
