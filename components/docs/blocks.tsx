import type { DocBlock } from "@/lib/docs/content";
import { cn } from "@/lib/utils";

const calloutTone = {
  accent: "border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[var(--accent-400)]",
  info: "border-[var(--info)]/25 bg-[var(--info-soft)] text-[var(--info)]",
  warning: "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]",
  success: "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]",
} as const;

export function BlockRenderer({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case "lead":
      return (
        <p className="text-[17px] leading-relaxed text-[var(--fg)]">{block.text}</p>
      );
    case "para":
      return (
        <p className="text-[15px] leading-relaxed text-[var(--fg-muted)]">{block.text}</p>
      );
    case "bullets":
      return (
        <ul className="space-y-2.5">
          {block.items.map((i) => (
            <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-[var(--fg-muted)]">
              <span className="mt-2 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              {i}
            </li>
          ))}
        </ul>
      );
    case "checks":
      return (
        <ul className="grid gap-3 sm:grid-cols-2">
          {block.items.map((i) => (
            <li
              key={i.label}
              className="rounded-xl border border-[var(--border)] bg-white/[0.015] p-4"
            >
              <div className="flex items-start gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" className="mt-0.5 shrink-0" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div>
                  <p className="text-[14px] font-medium text-[var(--fg)]">{i.label}</p>
                  {i.sub && <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg-muted)]">{i.sub}</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      );
    case "metrics":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {block.items.map((i) => (
            <div
              key={i.label}
              className="rounded-xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.005))] p-4"
            >
              <p className="font-display text-2xl font-semibold tracking-tight text-gradient-accent">{i.value}</p>
              <p className="mt-1 text-[13px] font-medium text-[var(--fg)]">{i.label}</p>
              {i.hint && <p className="mt-0.5 text-[12px] text-[var(--fg-subtle)]">{i.hint}</p>}
            </div>
          ))}
        </div>
      );
    case "cards":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((i) => (
            <div
              key={i.title}
              className="rounded-xl border border-[var(--border)] bg-white/[0.015] p-4 transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-[15px] font-semibold tracking-tight text-[var(--fg)]">{i.title}</p>
                {i.tag && (
                  <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                    {i.tag}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">{i.body}</p>
            </div>
          ))}
        </div>
      );
    case "steps":
      return (
        <ol className="space-y-3">
          {block.items.map((i, n) => (
            <li key={i.title} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] font-mono text-[12px] font-semibold text-[var(--accent-400)]">
                {n + 1}
              </span>
              <div className="pt-0.5">
                <p className="text-[15px] font-medium text-[var(--fg)]">{i.title}</p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-[var(--fg-muted)]">{i.body}</p>
              </div>
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-white/[0.02]">
                {block.headers.map((h) => (
                  <th key={h} className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, ri) => (
                <tr key={ri} className="border-b border-[var(--border)] last:border-0">
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        "px-4 py-2.5 align-top leading-relaxed",
                        ci === 0 ? "font-medium text-[var(--fg)]" : "text-[var(--fg-muted)]"
                      )}
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)] p-4 font-mono text-[12px] leading-relaxed text-[var(--fg-muted)]">
          <code>{block.text}</code>
        </pre>
      );
    case "callout":
      return (
        <div className={cn("rounded-xl border p-4", calloutTone[block.tone])}>
          <p className="text-[13px] font-semibold">{block.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed opacity-90">{block.text}</p>
        </div>
      );
    default:
      return null;
  }
}
