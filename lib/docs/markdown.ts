import {
  SECTIONS,
  FEATURE_MATRIX,
  type DocBlock,
  type DocSection,
} from "./content";
import type { DocsConfig, LiveStats } from "./types";

function blockToMd(b: DocBlock): string {
  switch (b.kind) {
    case "lead":
    case "para":
      return b.text;
    case "bullets":
      return b.items.map((i) => `- ${i}`).join("\n");
    case "checks":
      return b.items.map((i) => `- **${i.label}**${i.sub ? ` — ${i.sub}` : ""}`).join("\n");
    case "metrics":
      return b.items.map((i) => `- **${i.value}** — ${i.label}${i.hint ? ` (${i.hint})` : ""}`).join("\n");
    case "cards":
      return b.items.map((i) => `- **${i.title}**${i.tag ? ` _(${i.tag})_` : ""}: ${i.body}`).join("\n");
    case "steps":
      return b.items.map((i, n) => `${n + 1}. **${i.title}** — ${i.body}`).join("\n");
    case "table": {
      const head = `| ${b.headers.join(" | ")} |`;
      const sep = `| ${b.headers.map(() => "---").join(" | ")} |`;
      const rows = b.rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
      return [head, sep, rows].join("\n");
    }
    case "code":
      return "```" + b.lang + "\n" + b.text + "\n```";
    case "callout":
      return `> **${b.title}** — ${b.text}`;
    default:
      return "";
  }
}

function statusLabel(s: string): string {
  return s === "live" ? "✅ live" : s === "in_progress" ? "🟡 in progress" : s === "planned" ? "⏳ planned" : "🧪 experimental";
}

function sectionToMd(section: DocSection, ctx: { config: DocsConfig; stats: LiveStats }): string {
  const out: string[] = [`## ${section.title}`];
  if (section.description) out.push(`_${section.description}_`);

  for (const b of section.blocks) out.push(blockToMd(b));

  if (section.special === "team" || section.special === "contributors") {
    out.push(
      ctx.config.team
        .map((m) => `- **${m.name}** — ${m.role} · ${m.email}`)
        .join("\n")
    );
  }
  if (section.special === "feature-matrix") {
    out.push("| Category | Feature | Status | Notes |");
    out.push("| --- | --- | --- | --- |");
    for (const f of FEATURE_MATRIX) {
      out.push(`| ${f.category} | ${f.feature} | ${statusLabel(f.status)} | ${f.notes} |`);
    }
  }
  if (section.special === "overview-live") {
    const s = ctx.stats;
    out.push(
      `Live system snapshot (${s.source}): ${s.runs} runs · ${s.completedRuns} completed · ${s.campaigns} campaigns · ${s.verdicts} verdicts · ${s.brands} brands · ${s.ragSamples} RAG samples · ${s.agents} agents.`
    );
  }
  return out.filter(Boolean).join("\n\n");
}

/** Render the entire /docs deck to a Markdown string for export. */
export function docsToMarkdown(config: DocsConfig, stats: LiveStats): string {
  const parts: string[] = [
    `# ${config.teamName} — Live Documentation`,
    `> YC-style pitch deck + technical whitepaper. Generated ${new Date().toLocaleString()}.`,
    `## Pitch Deck`,
    ...SECTIONS.filter((s) => s.group === "pitch").map((s) => sectionToMd(s, { config, stats })),
    `## Technical Documentation`,
    ...SECTIONS.filter((s) => s.group === "technical").map((s) => sectionToMd(s, { config, stats })),
  ];
  return parts.join("\n\n");
}
