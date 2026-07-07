// Backfire OS — /docs content model.
// Structured, code-defined documentation that powers both the YC pitch deck and the
// technical whitepaper. Live data (counts, feature status) is layered on at render time.

export type SectionGroup = "pitch" | "technical";

export type DocBlock =
  | { kind: "lead"; text: string }
  | { kind: "para"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "checks"; items: { label: string; sub?: string }[] }
  | { kind: "metrics"; items: { value: string; label: string; hint?: string }[] }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "cards"; items: { title: string; body: string; tag?: string }[] }
  | { kind: "steps"; items: { title: string; body: string }[] }
  | { kind: "code"; lang: string; text: string }
  | { kind: "callout"; tone: "accent" | "info" | "warning" | "success"; title: string; text: string };

export type Special =
  | "overview-live"
  | "feature-matrix"
  | "diagram-architecture"
  | "diagram-dataflow"
  | "team"
  | "contributors";

export type DocSection = {
  id: string;
  label: string; // sidebar / nav label
  group: SectionGroup;
  eyebrow: string;
  title: string;
  description?: string;
  blocks: DocBlock[];
  /** Marks a section that needs a bespoke renderer (live data, diagrams, team grid). */
  special?: Special;
};

// ── Feature matrix (current = live-synced, others = roadmap) ──────────────────
export type FeatureStatus = "live" | "in_progress" | "planned" | "experimental";
export type FeatureRow = {
  category: string;
  feature: string;
  status: FeatureStatus;
  notes: string;
};

export const FEATURE_MATRIX: FeatureRow[] = [
  { category: "Core", feature: "Campaign upload (slogan + brief + values + image)", status: "live", notes: "components/upload-form.tsx" },
  { category: "Core", feature: "6-persona parallel red-team", status: "live", notes: "lib/orchestrator.ts" },
  { category: "Core", feature: "SSE streaming verdicts", status: "live", notes: "app/api/simulate/route.ts" },
  { category: "Core", feature: "Backfire Score Dashboard (6 metrics)", status: "live", notes: "components/score-dashboard.tsx" },
  { category: "Core", feature: "Meme Mutation Simulator (4 memes)", status: "live", notes: "lib/memes.ts" },
  { category: "Core", feature: "Bangla / English UI toggle", status: "live", notes: "lib/i18n.ts" },
  { category: "RAG", feature: "BnSentMix Banglish RAG (pgvector)", status: "live", notes: "lib/rag.ts" },
  { category: "RAG", feature: "20K-row BnSentMix seed pipeline", status: "live", notes: "scripts/seed-bnsentmix.ts" },
  { category: "Vision", feature: "Multimodal campaign visual parsing", status: "live", notes: "Gemini 3.5 Flash" },
  { category: "Brands", feature: "Brand entities (values + history)", status: "live", notes: "app/api/brands" },
  { category: "Brands", feature: "Brand Purist consistency audit", status: "live", notes: "lib/agents/definitions.ts" },
  { category: "Maps", feature: "Cultural Stress Heatmap", status: "live", notes: "components/cultural-heatmap.tsx" },
  { category: "Auth", feature: "Supabase auth + RLS", status: "live", notes: "middleware.ts" },
  { category: "Insights", feature: "Polarization graph", status: "live", notes: "components/polarization-graph.tsx" },
  { category: "Insights", feature: "Counterfactual branches", status: "live", notes: "components/counterfactual-branches.tsx" },
  { category: "Docs", feature: "Live /docs deck + access control", status: "live", notes: "app/docs" },
  { category: "Workflow", feature: "Boardroom Mode (multi-agent live debate)", status: "live", notes: "app/boardroom · framework-free state machine" },
  { category: "Workflow", feature: "Hybrid Groq debate engine (scout + compound)", status: "live", notes: "lib/groq.ts · token-streamed turns" },
  { category: "Workflow", feature: "Per-market region grounding (Boardroom)", status: "live", notes: "Dhaka/Sylhet/Chittagong/rural stress summary" },
  { category: "Workflow", feature: "Regulatory Pre-Mortem Generator", status: "live", notes: "app/post-mortem · lib/premortem" },
  { category: "Workflow", feature: "Failure-class strategy engine (5 classes)", status: "live", notes: "lib/premortem/strategies.ts" },
  { category: "Data", feature: "Firecrawl live-news ingestion", status: "planned", notes: "Roadmap — mid term" },
  { category: "AI", feature: "GraphRAG over brand × backlash events", status: "planned", notes: "Roadmap — mid term" },
  { category: "AI", feature: "LoResLM fine-tune on full BnSentMix", status: "planned", notes: "Roadmap — long term" },
  { category: "AI", feature: "Agentic safer-slogan rewriter", status: "experimental", notes: "Roadmap — long term" },
];

// ── Diagrams: node/edge data (dependency-free SVG) + mermaid source for export ─
export type DiagramColumn = { title: string; nodes: { id: string; label: string; sub?: string }[] };

export const ARCHITECTURE_COLUMNS: DiagramColumn[] = [
  { title: "Client", nodes: [{ id: "ui", label: "Next.js 16 App Router", sub: "React 19 · Tailwind 4" }] },
  { title: "API", nodes: [
    { id: "campaigns", label: "POST /api/campaigns" },
    { id: "simulate", label: "POST /api/simulate", sub: "SSE stream" },
    { id: "boardroom", label: "POST /api/boardroom", sub: "SSE · token stream" },
    { id: "premortem", label: "POST /api/premortem", sub: "SSE · token stream" },
    { id: "memes", label: "POST /api/memes" },
    { id: "brands", label: "GET/POST /api/brands" },
  ] },
  { title: "Services (lib/)", nodes: [
    { id: "orch", label: "Orchestrator", sub: "parallel fan-out" },
    { id: "debate", label: "Boardroom engine", sub: "framework-free state machine" },
    { id: "premortem", label: "Pre-Mortem engine", sub: "strategy lookup map" },
    { id: "rag", label: "Banglish RAG" },
    { id: "vision", label: "Vision Parser" },
    { id: "score", label: "Score Aggregator" },
  ] },
  { title: "AI + Data", nodes: [
    { id: "llm", label: "Gemini 3.5 Flash", sub: "structured JSON + vision" },
    { id: "groq", label: "Groq scout + compound", sub: "streamed debate turns" },
    { id: "img", label: "Pollinations / Flux", sub: "meme images" },
    { id: "db", label: "Supabase + pgvector", sub: "RLS per user" },
  ] },
];

export const DATAFLOW_STAGES: DiagramColumn[] = [
  { title: "Input", nodes: [
    { id: "slogan", label: "Slogan + values + brief" },
    { id: "visual", label: "Optional visual" },
    { id: "brand", label: "Brand entity + history" },
  ] },
  { title: "Processing", nodes: [
    { id: "persist", label: "Validate & persist" },
    { id: "describe", label: "Vision describes image" },
    { id: "embed", label: "Embed + pgvector match", sub: "top-5 Banglish" },
  ] },
  { title: "AI", nodes: [
    { id: "agents", label: "6 agent prompts" },
    { id: "model", label: "Gemini structured JSON" },
    { id: "agg", label: "Score aggregator + memes" },
  ] },
  { title: "Output", nodes: [
    { id: "stream", label: "SSE verdict stream" },
    { id: "dash", label: "Backfire Dashboard" },
    { id: "extras", label: "Memes · Heatmap · Graph" },
  ] },
  { title: "War room", nodes: [
    { id: "board", label: "Boardroom debate", sub: "4 personas · per-market grounding" },
    { id: "pm", label: "Pre-Mortem report", sub: "forward-dated incident" },
  ] },
  { title: "Feedback", nodes: [
    { id: "edit", label: "Edit slogan / fork branch" },
    { id: "history", label: "Brand history grows" },
  ] },
];

export const MERMAID_ARCHITECTURE = `flowchart TD
  U[User] --> UI[Next.js 16 App Router]
  UI -->|fetch / SSE| API[Route Handlers]
  API --> ORCH[Orchestrator]
  API --> BOARD[Boardroom engine]
  API --> PM[Pre-Mortem engine]
  ORCH --> RAG[Banglish RAG] & VIS[Vision] & SCORE[Score Aggregator]
  ORCH --> AGENTS[6 Red-Team Personas]
  AGENTS --> LLM[Gemini 3.5 Flash]
  BOARD --> GROQ[Groq scout + compound]
  BOARD -.fallback.-> LLM
  PM --> LLM
  SCORE --> DB[(Supabase + pgvector)]
  RAG --> DB
  BOARD --> DB
  PM --> DB`;

export const MERMAID_DATAFLOW = `flowchart LR
  IN[Slogan + visual + brand] --> PROC[Validate · Vision · Embed]
  PROC --> AI[6 agents -> Gemini -> Score]
  AI --> OUT[SSE -> Dashboard -> Memes/Heatmap]
  OUT --> WAR[Boardroom debate + Pre-Mortem]
  WAR --> FB[Edit / fork -> brand history]
  FB --> IN`;

// ── Sections ─────────────────────────────────────────────────────────────────
export const SECTIONS: DocSection[] = [
  // ---------- YC PITCH DECK ----------
  {
    id: "problem", label: "Problem", group: "pitch", eyebrow: "01 · Pitch",
    title: "Brands launch blind into culture wars",
    description: "Traditional MarTech predicts success. Nobody predicts failure.",
    blocks: [
      { kind: "lead", text: "Every week a brand campaign in an emerging market detonates — a tone-deaf slogan, a mistranslated pun, a regulatory tripwire — and the team finds out from the memes, not the model." },
      { kind: "bullets", items: [
        "Pre-launch testing today = focus groups and gut feel. Slow, expensive, and blind to Banglish code-mixed sentiment.",
        "Culture-war backlash is asymmetric: one parody meme can erase a quarter of brand equity overnight.",
        "Regulators (Digital Commerce Guidelines, Essential Commodities Act 2025) move faster than legal review.",
        "Agencies have no way to wargame how the internet will weaponise a campaign before it ships.",
      ] },
      { kind: "callout", tone: "warning", title: "The gap", text: "There is no penetration-test layer for marketing. Brands ship creative the way startups used to ship code before security review." },
    ],
  },
  {
    id: "solution", label: "Solution", group: "pitch", eyebrow: "01 · Pitch",
    title: "Penetration testing for campaigns",
    description: "Six adversarial AI personas red-team your creative before it ships.",
    blocks: [
      { kind: "lead", text: "Backfire OS fans every campaign out to six adversarial AI personas in parallel. Verdicts stream back over SSE and aggregate into six composite risk metrics — rendered as a live Backfire Dashboard." },
      { kind: "cards", items: [
        { title: "Meme Engineer", body: "Generates the 4 most likely parody memes the internet would make.", tag: "weight 1.2" },
        { title: "Regional Outsider", body: "Stress-tests against Dhaka / Sylhet / Chittagong / rural readings.", tag: "weight 1.0" },
        { title: "Cynical Journalist", body: "Cross-examines every claim for a takedown headline.", tag: "weight 1.3" },
        { title: "Rival Brand", body: "Plans the hijack — how a competitor would weaponise the launch.", tag: "weight 1.1" },
        { title: "Regulatory Activist", body: "Surfaces Digital Commerce / Essential Commodities tripwires.", tag: "weight 1.4" },
        { title: "Brand Purist", body: "Audits consistency against the brand's own prior public stance.", tag: "weight 1.2" },
      ] },
      { kind: "para", text: "Output: a Backfire Score, mutated parody memes, a cultural stress heatmap, a polarization graph, and counterfactual branches — in ~30 seconds." },
      { kind: "callout", tone: "success", title: "The pre-launch war room is live", text: "Three surfaces now extend Backfire OS from a verdict engine into a full pre-launch war room — a live boardroom debate and a forward-dated pre-mortem on top of counterfactual branching." },
      { kind: "cards", items: [
        { title: "Counterfactual Branching", body: "Git for campaigns — fork the slogan, tweak a value, and watch how the Backfire Score shifts in real time.", tag: "Live" },
        { title: "Boardroom Mode", body: "Four synthetic personas debate the campaign live, token-streamed turn by turn, grounded in the per-market stress map; ends in a structured greenlight / revise / kill call with dissenting views.", tag: "Live" },
        { title: "Regulatory Pre-Mortem", body: "Takes the harshest red-team verdict and writes the forward-dated incident report — the headline, blast radius, and apology the brand would be forced to publish months later.", tag: "Live" },
      ] },
    ],
  },
  {
    id: "why-now", label: "Why Now", group: "pitch", eyebrow: "01 · Pitch",
    title: "Why now",
    blocks: [
      { kind: "checks", items: [
        { label: "Frontier multimodal models are finally cheap & fast", sub: "Gemini 3.5 Flash does vision + reasoning + structured JSON at sub-second latency." },
        { label: "Code-mixed (Banglish) NLP is now tractable", sub: "Open corpora like BnSentMix + pgvector make emerging-market sentiment retrievable." },
        { label: "Regulation is tightening", sub: "Bangladesh Digital Commerce Guidelines & Essential Commodities Act 2025 raise the cost of a misfire." },
        { label: "Backlash is faster than ever", sub: "Meme cycles compress a PR crisis from weeks to hours — pre-mortem is the only defense." },
      ] },
    ],
  },
  {
    id: "product", label: "Product Demo", group: "pitch", eyebrow: "01 · Pitch",
    title: "What you get in 30 seconds",
    blocks: [
      { kind: "steps", items: [
        { title: "Paste your campaign", body: "Slogan, brand values, brief, and an optional visual. Or pick a saved brand entity." },
        { title: "Watch the red team work", body: "Six personas analyse in parallel; verdicts stream in live over Server-Sent Events." },
        { title: "Read the Backfire Dashboard", body: "Six metrics, per-agent reasoning with citations, parody memes, heatmap, polarization graph." },
        { title: "Fork and iterate", body: "Branch the campaign as a counterfactual and watch the score move in real time." },
      ] },
      { kind: "callout", tone: "info", title: "Try it live", text: "The Simulate page (/) runs a full demo with mock verdicts even without API keys — no setup required for judges." },
    ],
  },
  {
    id: "market", label: "Market", group: "pitch", eyebrow: "01 · Pitch",
    title: "Market opportunity",
    blocks: [
      { kind: "metrics", items: [
        { value: "$0.7T", label: "Global ad spend", hint: "exposed to brand-safety risk" },
        { value: "$8B+", label: "Brand-safety / verification", hint: "fastest-growing MarTech segment" },
        { value: "1.9B", label: "People across target markets", hint: "BD → India, Pakistan, Indonesia, Nigeria" },
      ] },
      { kind: "para", text: "We start where the pain is sharpest and the tooling is thinnest: Bangladeshi consumer brands (FMCG, F-commerce, telco, fintech) and the agencies serving them, then expand the cultural stress map across emerging markets." },
    ],
  },
  {
    id: "business-model", label: "Business Model", group: "pitch", eyebrow: "01 · Pitch",
    title: "Business model",
    blocks: [
      { kind: "cards", items: [
        { title: "Seat-based SaaS", body: "Per-editor monthly subscription for brand & agency teams.", tag: "Core" },
        { title: "Usage tier", body: "Metered simulations beyond the plan quota; demo mode stays free.", tag: "Expansion" },
        { title: "Enterprise / on-prem", body: "Fine-tuned on-prem inference + audit-grade compliance reports.", tag: "Long term" },
        { title: "API / SDK", body: "Agencies embed Backfire OS inside their own creative tooling.", tag: "Platform" },
      ] },
    ],
  },
  {
    id: "traction", label: "Traction", group: "pitch", eyebrow: "01 · Pitch",
    title: "Traction",
    description: "Numbers below are pulled live from the running system.",
    blocks: [
      { kind: "para", text: "Built end-to-end: a working adversarial engine, real Banglish RAG over ~20K samples, multimodal vision, and a full persistence + auth layer." },
    ],
    special: "overview-live",
  },
  {
    id: "competition", label: "Competition", group: "pitch", eyebrow: "01 · Pitch",
    title: "Competition",
    blocks: [
      { kind: "table", headers: ["Approach", "Predicts failure?", "Culture-aware?", "Pre-launch?"], rows: [
        ["Brand-safety verification (DV, IAS)", "Post-hoc placement only", "No", "No"],
        ["Social listening (Brandwatch, Talkwalker)", "After it trends", "Partial", "No"],
        ["Focus groups / agencies", "Subjective", "Yes (slow)", "Yes (slow)"],
        ["Backfire OS", "Yes — by design", "Yes (Banglish RAG)", "Yes (~30s)"],
      ] },
    ],
  },
  {
    id: "advantage", label: "Unique Advantage", group: "pitch", eyebrow: "01 · Pitch",
    title: "Unfair advantage",
    blocks: [
      { kind: "checks", items: [
        { label: "Adversarial-by-design", sub: "We model how a campaign fails, not whether it succeeds — a different objective function than every incumbent." },
        { label: "Emerging-market RAG moat", sub: "Banglish/code-mixed sentiment retrieval that compounds as brand history accumulates." },
        { label: "Explainable verdicts", sub: "Every score traces back to cited corpus rows — no black box, audit-ready." },
        { label: "Gets sharper with use", sub: "The Brand Purist ingests each brand's own history; accuracy increases per run." },
      ] },
    ],
  },
  {
    id: "gtm", label: "Go-To-Market", group: "pitch", eyebrow: "01 · Pitch",
    title: "Go-to-market",
    blocks: [
      { kind: "steps", items: [
        { title: "Land via agencies", body: "Creative directors run pre-launch reviews on client work — one account, many brands." },
        { title: "Expand to in-house teams", body: "Brand managers adopt for every campaign once they see one catch." },
        { title: "Anchor with regulators", body: "Ad-standards bodies use audit-grade reports — distribution & credibility." },
        { title: "Platform out", body: "API/SDK + community persona marketplace for self-serve growth." },
      ] },
    ],
  },
  {
    id: "team", label: "Team", group: "pitch", eyebrow: "01 · Pitch",
    title: "Team",
    description: "The people behind Backfire OS.",
    blocks: [],
    special: "team",
  },
  {
    id: "vision", label: "Vision", group: "pitch", eyebrow: "01 · Pitch",
    title: "Vision",
    blocks: [
      { kind: "lead", text: "Every brand campaign on earth should pass an adversarial review before it reaches the public — the way every line of code passes security review." },
      { kind: "para", text: "Backfire OS becomes the standard pre-launch safety layer for marketing in emerging markets, then everywhere: a shared, explainable, culture-aware immune system for brands." },
    ],
  },

  // ---------- TECHNICAL DOCUMENTATION ----------
  {
    id: "overview", label: "Product Overview", group: "technical", eyebrow: "02 · Technical",
    title: "Product overview",
    blocks: [
      { kind: "lead", text: "Backfire OS is a pre-launch failure-prediction layer for brand campaigns — a live system you can interrogate." },
      { kind: "cards", items: [
        { title: "Target users", body: "Brand managers & CMOs, agency creative directors, comms/PR crisis teams, regulators, and code-mixed-sentiment researchers." },
        { title: "Core use case", body: "Pre-launch red-team review: paste a campaign, get six adversarial verdicts and a risk dashboard in ~30 seconds." },
        { title: "Differentiator", body: "It predicts how a campaign fails (parody, regulatory action, regional backlash, rival hijack, self-contradiction) before launch." },
      ] },
    ],
    special: "overview-live",
  },
  {
    id: "features", label: "Feature Matrix", group: "technical", eyebrow: "02 · Technical",
    title: "Feature matrix",
    description: "Current features are synced live from the codebase; upcoming items are the roadmap.",
    blocks: [],
    special: "feature-matrix",
  },
  {
    id: "architecture", label: "Architecture", group: "technical", eyebrow: "02 · Technical",
    title: "Architecture",
    description: "UI → API → Services → AI/DB. Stateless route handlers scale horizontally on Vercel; the red-team orchestrator and the two war-room engines (Boardroom, Pre-Mortem) sit side by side, each streaming over SSE.",
    blocks: [],
    special: "diagram-architecture",
  },
  {
    id: "data-flow", label: "Data Flow", group: "technical", eyebrow: "02 · Technical",
    title: "Data flow",
    description: "Input → Processing → AI → Output → Feedback loop.",
    blocks: [],
    special: "diagram-dataflow",
  },
  {
    id: "stack", label: "Technology Stack", group: "technical", eyebrow: "02 · Technical",
    title: "Technology stack",
    blocks: [
      { kind: "cards", items: [
        { title: "Frontend", body: "Next.js 16.2 App Router · React 19.2 · Tailwind CSS 4 · server components + client islands · SSE streaming · custom Bangla/English i18n.", tag: "UI" },
        { title: "Backend", body: "Next.js Route Handlers (Node runtime, maxDuration 120s) · native ReadableStream / text-event-stream · Zod 4 validation · @supabase/ssr cookie auth.", tag: "API" },
        { title: "Database", body: "Supabase Postgres + pgvector (768-dim, IVFFlat) · per-user RLS · Supabase Storage for visuals · in-memory fallback in demo mode.", tag: "Data" },
        { title: "AI", body: "Gemini 3.5 Flash (reasoning + vision + meme captions) · Groq llama-4-scout + groq/compound (streamed debate turns) · text-embedding-004 (768d) · Pollinations/Flux images · BnSentMix RAG corpus.", tag: "AI" },
        { title: "Agents", body: "Framework-free, hand-rolled state machines — no LangChain/agent SDK. Boardroom debate = one model call per turn; Pre-Mortem = strategy-lookup prompt framing. Deliberate, to stay inside free-tier request budgets.", tag: "Engine" },
        { title: "Infrastructure", body: "Vercel hosting (preview + prod) · Supabase DB · Pollinations image CDN · pnpm · TypeScript 5 strict.", tag: "Ops" },
      ] },
    ],
  },
  {
    id: "api", label: "API Documentation", group: "technical", eyebrow: "02 · Technical",
    title: "API documentation",
    blocks: [
      { kind: "para", text: "Auth model: Supabase email/password via @supabase/ssr; cookies refreshed in middleware. Every handler calls resolveDbContext() → db (authenticated), unauthorized (401), or db_unconfigured (503, demo). Postgres RLS scopes rows by auth.uid()." },
      { kind: "table", headers: ["Endpoint", "Method", "Purpose"], rows: [
        ["/api/campaigns", "POST", "Create a campaign + initial run"],
        ["/api/campaigns?runId=", "GET", "Fetch one run (verdicts, memes, stress map)"],
        ["/api/simulate", "POST", "Run 6-agent simulation — SSE stream"],
        ["/api/boardroom", "GET / POST", "List saved debates / run a live multi-agent debate — SSE token stream"],
        ["/api/premortem", "GET / POST", "List saved reports / generate a forward-dated pre-mortem — SSE token stream"],
        ["/api/memes", "POST", "Generate 4 parody memes + Memeability"],
        ["/api/brands", "GET / POST", "List / create brand entities"],
        ["/api/brands/[id]", "GET / PATCH / DELETE", "Inspect / update / delete a brand"],
        ["/api/docs/config", "GET / PUT", "Read config / admin-only update (visibility, schedule, team)"],
        ["/api/docs/live", "GET", "Live system stats for this page"],
      ] },
      { kind: "callout", tone: "info", title: "SSE events", text: "/api/simulate: status · agent_start · agent_verdict ×6 · stress_map · complete · error.  /api/boardroom: debate_start · speaker_start · token · speaker_end · round_end · synthesis · complete · error.  /api/premortem: premortem_start · token · complete · error." },
    ],
  },
  {
    id: "data-layer", label: "Data Layer", group: "technical", eyebrow: "02 · Technical",
    title: "Data layer",
    blocks: [
      { kind: "bullets", items: [
        "Sources: BnSentMix (~20K labelled Banglish samples), cultural stress-map definitions, user campaign data, brand entities, embedded regulatory references.",
        "Ingestion: download-bnsentmix.ts pulls parquet from HF; seed-bnsentmix.ts embeds with text-embedding-004 and upserts into pgvector (resumable).",
        "Storage: campaigns, simulation_runs, agent_verdicts, memes, bnsentmix_samples (vector 768), brands, cultural_stress_maps, docs_config.",
        "War-room tables: boardroom_debates and premortem_reports — both append-only (one row per iteration, history never overwritten), indexed (run_id, created_at desc) and read newest-first, so re-runs and counterfactual-branch variants accumulate side by side.",
        "Object storage: Supabase Storage buckets campaign-images & meme-images, RLS-scoped per user.",
      ] },
      { kind: "callout", tone: "success", title: "Privacy", text: "All tables RLS-protected; no PII collected; campaign content treated as user IP; demo mode never hits external services; AI outputs labelled synthetic." },
    ],
  },
  {
    id: "ai-layer", label: "AI Layer", group: "technical", eyebrow: "02 · Technical",
    title: "AI layer",
    blocks: [
      { kind: "table", headers: ["Role", "Model", "Provider"], rows: [
        ["Agent reasoning (×6)", "gemini-3.5-flash", "Google AI"],
        ["Vision (image → description)", "gemini-3.5-flash", "Google AI"],
        ["Embeddings", "text-embedding-004 (768d)", "Google AI"],
        ["Boardroom debate (3 personas)", "llama-4-scout-17b", "Groq"],
        ["Boardroom Activist (agentic)", "groq/compound", "Groq"],
        ["Boardroom fallback", "gemini-3.5-flash stream → scripted mock", "Google AI"],
        ["Pre-Mortem report", "gemini-3.5-flash → scripted mock", "Google AI"],
        ["Meme images (primary)", "Flux Schnell", "Pollinations.ai"],
        ["Meme images (fallback)", "Gemini image gen", "Google AI"],
      ] },
      { kind: "bullets", items: [
        "RAG: match_bnsentmix(query_embedding, 5) — cosine on IVFFlat; top-5 Banglish examples injected into every agent prompt.",
        "Personalization: the Brand Purist ingests a brand's canonical values + its 10 most-recent runs, so accuracy compounds with history.",
        "Weighted ensemble: Regulatory 1.4 · Journalist 1.3 · Meme/Purist 1.2 · Rival 1.1 · Outsider 1.0.",
        "Hybrid debate: only the adversarial Activist runs on the agentic groq/compound model; the other three personas use the fast, quota-cheap scout model so a full debate stays inside the free-tier budget (30 RPM / 250 req-day).",
        "Graceful degradation: each turn streams from Groq, falls back to a Gemini token stream if GROQ_API_KEY is absent, and finally to a scripted mock — so the live transcript always types out, even with zero keys.",
        "Explainability: every verdict is structured JSON with severity, reasoning, sample_attack and citation_ids back to corpus rows — no black box.",
      ] },
    ],
  },
  {
    id: "war-room", label: "War-Room Engines", group: "technical", eyebrow: "02 · Technical",
    title: "War-room engines",
    description: "Two framework-free engines turn a completed run into a live debate and a forward-dated obituary — the newest architectural layer on top of the red-team.",
    blocks: [
      { kind: "lead", text: "Both engines are deliberately hand-rolled state machines — no LangChain, no agent SDK. Agent frameworks make hidden, redundant model calls that would blow free-tier request budgets; instead each engine makes exactly the calls it needs and streams every token to the client over SSE." },
      { kind: "cards", items: [
        { title: "Boardroom Mode", body: "Four opposed personas (Brand Manager, Activist, Journalist, Brand Purist) argue the campaign in fixed speaking order across capped rounds, then a synthesis call returns a greenlight / revise / kill decision with conditions.", tag: "lib/boardroom" },
        { title: "Pre-Mortem Generator", body: "Classifies the run's worst plausible failure, selects a per-class prompt-framing strategy, and writes the incident report the brand would publish ~6 months after the misfire.", tag: "lib/premortem" },
      ] },
      { kind: "steps", items: [
        { title: "Hybrid Groq model assignment", body: "The Boardroom runs the adversarial Activist on the agentic groq/compound model and the other three personas on the fast llama-4-scout — one model call per turn, streamed token-by-token." },
        { title: "Per-market grounding", body: "Each debate is pinned to the run's own red-team findings plus a per-market cultural-stress summary (Dhaka / Sylhet / Chittagong / rural), so personas argue regional fit instead of a single global severity number." },
        { title: "Convergence + round cap", body: "A heuristic halts the debate early when the room converges; rounds are hard-capped (BOARDROOM_MAX_ROUNDS, default 2) as the primary 429 protection." },
        { title: "Strategy-via-lookup framing", body: "Pre-Mortem maps the harshest critic to one of five failure classes (regulatory · cultural · reputational · competitive · brand) and pulls its framing from a Record<FailureType, fn> — no Strategy-class hierarchy." },
        { title: "Append-only iterations", body: "Every debate and every report is saved as a new row keyed by run, so re-runs and counterfactual-branch variants accumulate into a browsable timeline rather than overwriting history." },
      ] },
      { kind: "callout", tone: "info", title: "Always degrades, never dies", text: "Groq turn → Gemini token-stream fallback → scripted mock. The synthesis and the full report fall back the same way, so the war room still runs end-to-end with zero API keys (demo mode)." },
    ],
  },
  {
    id: "roadmap", label: "Roadmap", group: "technical", eyebrow: "02 · Technical",
    title: "Product roadmap",
    blocks: [
      { kind: "cards", items: [
        { title: "Short term — now shipped", body: "Counterfactual Branching, Boardroom Mode (hybrid Groq debate + per-market grounding) & Regulatory Pre-Mortem are all live. Next: per-run shareable URLs and better meme image quality.", tag: "Now" },
        { title: "Mid term — by Aug 2026", body: "Firecrawl live-news ingestion; GraphRAG over brand × backlash; CSV/Figma import; Slack/Teams alerts; multi-brand workspaces; expand map to IN/PK/ID/NG.", tag: "Next" },
        { title: "Long term — by 2027 Q2", body: "LoResLM on-prem fine-tune; agentic safer-slogan rewriter; API/SDK; audit-grade signed compliance reports; community persona marketplace.", tag: "Later" },
      ] },
    ],
  },
  {
    id: "performance", label: "Performance", group: "technical", eyebrow: "02 · Technical",
    title: "Performance & scalability",
    blocks: [
      { kind: "metrics", items: [
        { value: "<1s", label: "Warm SSE TTFB", hint: "first status event" },
        { value: "~25–35s", label: "Full cold run", hint: "6 agents + vision + 4 memes" },
        { value: "<50ms", label: "RAG retrieval", hint: "top-5 @ 20K vectors" },
        { value: "100", label: "Concurrent authors", hint: "MVP target" },
      ] },
      { kind: "bullets", items: [
        "Parallel agent fan-out (Promise.all): total latency = slowest agent, not the sum.",
        "SSE streaming so verdicts render as they land.",
        "pgvector IVFFlat (lists=100) keeps retrieval sub-50ms.",
        "Server components keep the JS bundle small; stateless handlers scale horizontally on Vercel.",
        "War-room engines are framework-free: exactly one model call per debate turn and a hard round cap (default 2) plus an early-convergence halt, keeping a full debate inside Groq's free-tier budget (30 RPM / 250 req-day).",
        "Token-streamed Boardroom & Pre-Mortem output renders as it generates, so a multi-round debate feels live instead of blocking on a long completion.",
        "Demo-mode short-circuit so judges never burn LLM quota.",
      ] },
    ],
  },
  {
    id: "security", label: "Security", group: "technical", eyebrow: "02 · Technical",
    title: "Security",
    blocks: [
      { kind: "checks", items: [
        { label: "Authentication", sub: "Supabase email/password; cookies refreshed by middleware on every request; server-side sign-out." },
        { label: "Authorization / RBAC", sub: "Postgres RLS on every user-scoped table; handlers validate resolveDbContext(); /docs adds an admin layer (role or email allowlist)." },
        { label: "Secrets", sub: "Env vars only; SERVICE_ROLE key is server-only; .env.local gitignored." },
        { label: "Data protection", sub: "TLS end-to-end; user-scoped Storage paths; strict JSON schema parsing of LLM output guards against prompt-injection echo." },
      ] },
      { kind: "callout", tone: "warning", title: "Known gaps", text: "Prompt injection via brief (mitigated by schema parsing), free-key abuse (per-user rate limiting planned), server-side upload limits (hardening planned)." },
    ],
  },
  {
    id: "analytics", label: "Analytics", group: "technical", eyebrow: "02 · Technical",
    title: "Analytics & KPIs",
    blocks: [
      { kind: "table", headers: ["KPI", "Target", "Source"], rows: [
        ["Time-to-first-verdict (SSE)", "< 5s p95", "/api/simulate timing"],
        ["Full-run completion", "< 45s p95", "created_at → complete"],
        ["Runs per active brand / week", "≥ 3", "simulation_runs"],
        ["% runs forked to counterfactuals", "≥ 25%", "branch events"],
        ["Demo → signup conversion", "≥ 15%", "auth vs demo sessions"],
      ] },
      { kind: "para", text: "Tracked: runs created/completed/failed, per-agent severity distributions, RAG citation counts, meme success vs fallback, language toggle usage. Instrumentation today = Vercel logs + Supabase insights; PostHog/Plausible + Sentry planned (opt-out)." },
    ],
  },
  {
    id: "contributors", label: "Team & Contributors", group: "technical", eyebrow: "02 · Technical",
    title: "Team & contributors",
    description: "Same roster as the pitch Team slide — the people who own each layer.",
    blocks: [],
    special: "contributors",
  },
  {
    id: "changelog", label: "Changelog", group: "technical", eyebrow: "02 · Technical",
    title: "Changelog",
    blocks: [
      { kind: "steps", items: [
        { title: "v0.2 — Per-market grounding & spoken-turn style", body: "Boardroom debates pinned to a per-market cultural-stress summary (Dhaka/Sylhet/Chittagong/rural) and a region context; turns enforced as live spoken argument with sharper fallbacks." },
        { title: "v0.2 — Regulatory Pre-Mortem Generator", body: "Forward-dated incident report (headline · timeline · blast radius · apology · exposure) driven by a five-class failure strategy engine; new /api/premortem SSE route + premortem_reports table." },
        { title: "v0.2 — Boardroom Mode", body: "Live multi-agent debate on a framework-free state machine with the hybrid Groq architecture (llama-4-scout + groq/compound), convergence + round caps; new /api/boardroom SSE route + boardroom_debates table." },
        { title: "v0.1 — Brand assets, panel AI, retries & provenance", body: "Verdict provenance (ai/mock), retry logic, brand asset polish, panel prompt." },
        { title: "v0.1 — Counterfactual branches", body: "Git-style campaign forks with live score deltas + dedicated page." },
        { title: "v0.1 — Graph selection & run-aware header", body: "Polarization graph selection, run-aware navigation, optimized run loading." },
        { title: "v0.1 — /docs module", body: "Live YC deck + technical whitepaper with admin access control & scheduling (this page)." },
      ] },
    ],
  },
];

export const PITCH_SECTIONS = SECTIONS.filter((s) => s.group === "pitch");
export const TECHNICAL_SECTIONS = SECTIONS.filter((s) => s.group === "technical");

export function getSection(id: string): DocSection | undefined {
  return SECTIONS.find((s) => s.id === id);
}
