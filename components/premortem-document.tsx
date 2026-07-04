"use client";

import { Badge } from "@/components/ui/badge";
import type { FailureType, PreMortemReport } from "@/lib/premortem/types";

/* ──────────────────────────────────────────────────────────────────
   Pre-Mortem document — renders the generated obituary as a sober
   incident report / front page. Shared by the live stream (raw Markdown
   typing out) and the final structured report.
   ────────────────────────────────────────────────────────────────── */

type FailureTone = {
  label: string;
  badge: "danger" | "warning" | "accent" | "info";
  accent: string;
};

export const FAILURE_TONE: Record<FailureType, FailureTone> = {
  regulatory: { label: "Regulatory Breach", badge: "danger", accent: "var(--danger)" },
  cultural: { label: "Cultural Backlash", badge: "warning", accent: "var(--warning)" },
  reputational: { label: "Reputational Crisis", badge: "accent", accent: "var(--accent)" },
  competitive: { label: "Competitive Hijack", badge: "info", accent: "var(--info)" },
  brand: { label: "Brand-Integrity Collapse", badge: "accent", accent: "var(--accent)" },
};

/**
 * Inline emphasis (**bold**, *italic*, __bold__) → React nodes. Unclosed markers
 * mid-stream fall through as plain text and resolve once the closing marker
 * arrives. Mirrors the approach in boardroom-mode.tsx.
 */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|__([^_]+)__/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const bold = m[1] ?? m[3];
    if (bold !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[var(--fg)]">
          {bold}
        </strong>
      );
    } else if (m[2] !== undefined) {
      nodes.push(<em key={key++}>{m[2]}</em>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "li"; items: string[] }
  | { kind: "p"; text: string };

/** Splits a Markdown body into the small block set the report uses. */
function toBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "p", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ kind: "li", items: list });
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) {
      flushPara();
      flushList();
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ kind: "h1", text: line.replace(/^#\s+/, "") });
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ kind: "h2", text: line.replace(/^##\s+/, "") });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      list.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-2.5">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[var(--fg-muted)]"
        >
          <span className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
          <span>{renderInline(it)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Renders raw streaming Markdown (used while the document types out). */
function MarkdownBlocks({ markdown }: { markdown: string }) {
  const blocks = toBlocks(markdown);
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (b.kind === "h1") {
          return (
            <h2
              key={i}
              className="font-display text-[24px] font-semibold leading-tight tracking-tight text-[var(--fg)] sm:text-[30px]"
            >
              {renderInline(b.text)}
            </h2>
          );
        }
        if (b.kind === "h2") {
          return (
            <h3
              key={i}
              className="pt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]"
            >
              {b.text}
            </h3>
          );
        }
        if (b.kind === "li") return <Bullets key={i} items={b.items} />;
        return (
          <p key={i} className="text-[14px] leading-relaxed text-[var(--fg-muted)]">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

/** The masthead shown above both the live and final document. */
function Masthead({
  failureType,
  publishDate,
  source,
}: {
  failureType: FailureType;
  publishDate: string;
  source?: "ai" | "mock";
}) {
  const tone = FAILURE_TONE[failureType];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5 sm:px-7">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={tone.badge} dot>
          {tone.label}
        </Badge>
        {source === "mock" && <Badge variant="demo">Heuristic draft</Badge>}
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        Post-mortem · {publishDate}
      </p>
    </div>
  );
}

/* ── Live streaming document ──────────────────────────────────────── */

export function LiveDocument({
  markdown,
  failureType,
  publishDate,
}: {
  markdown: string;
  failureType: FailureType;
  publishDate: string;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[image:var(--veil)] backdrop-blur-xl">
      <Masthead failureType={failureType} publishDate={publishDate} />
      <div className="px-5 py-6 sm:px-7 sm:py-8">
        {markdown.trim().length === 0 ? (
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            Drafting the obituary…
          </p>
        ) : (
          <>
            <MarkdownBlocks markdown={markdown} />
            <span className="blink-caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-[var(--fg)] align-middle" />
          </>
        )}
      </div>
    </article>
  );
}

/* ── Final structured report ──────────────────────────────────────── */

export function PreMortemDocument({ report }: { report: PreMortemReport }) {
  const tone = FAILURE_TONE[report.failureType];
  return (
    <article className="fade-up overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[image:var(--veil)] backdrop-blur-xl">
      <Masthead
        failureType={report.failureType}
        publishDate={report.publishDate}
        source={report.source}
      />

      <div className="px-5 py-7 sm:px-8 sm:py-9">
        {/* Headline + standfirst */}
        <header className="border-b border-[var(--border)] pb-7">
          <h1 className="font-display text-[26px] font-semibold leading-[1.1] tracking-tight text-[var(--fg)] sm:text-[38px]">
            {report.headline}
          </h1>
          {report.dek && (
            <p className="mt-3 max-w-2xl text-[15px] italic leading-relaxed text-[var(--fg-muted)] sm:text-[16px]">
              {report.dek}
            </p>
          )}
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
            Grounded in the harshest critic · {report.topCriticName} · severity{" "}
            {report.worstSeverity}/100
          </p>
        </header>

        {/* The apology callout */}
        {report.apology && (
          <section
            className="relative mt-7 overflow-hidden rounded-2xl border px-5 py-5 sm:px-6"
            style={{
              borderColor: `color-mix(in oklab, ${tone.accent} 30%, transparent)`,
              background: `linear-gradient(180deg, color-mix(in oklab, ${tone.accent} 8%, transparent), transparent)`,
            }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-0 h-full w-[3px]"
              style={{ background: tone.accent }}
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              The apology we were forced to publish
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--fg)]">
              {renderInline(report.apology)}
            </p>
          </section>
        )}

        {/* Remaining sections */}
        <div className="mt-8 space-y-8">
          {report.sections.map((s, i) => (
            <section key={i}>
              <h3 className="mb-2 flex items-center gap-2.5 font-display text-[16px] font-semibold tracking-tight text-[var(--fg)]">
                <span
                  className="inline-block h-3.5 w-[3px] rounded-full"
                  style={{ background: tone.accent }}
                />
                {s.heading}
              </h3>
              <div className="pl-[14px]">
                <MarkdownBlocks markdown={s.body} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
