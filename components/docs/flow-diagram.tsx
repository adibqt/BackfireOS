import type { DiagramColumn } from "@/lib/docs/content";
import { CopyButton } from "./copy-button";

function Node({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elev-1)]/80 px-3 py-2.5 text-center shadow-sm">
      <p className="text-[12.5px] font-medium leading-tight text-[var(--fg)]">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-tight text-[var(--fg-subtle)]">{sub}</p>}
    </div>
  );
}

/**
 * Dependency-free flow diagram: each stage is a column of nodes, connected by
 * arrows that flow horizontally on desktop and vertically on mobile. The Mermaid
 * source is offered alongside for editing / export.
 */
export function FlowDiagram({
  columns,
  mermaid,
}: {
  columns: DiagramColumn[];
  mermaid?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,77,87,0.06),transparent_70%)] p-5">
        <div className="flex min-w-fit flex-col gap-4 md:flex-row md:items-stretch">
          {columns.map((col, ci) => (
            <div key={col.title} className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-w-[160px] flex-1 flex-col gap-2.5">
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
                  {col.title}
                </p>
                <div className="flex flex-col gap-2">
                  {col.nodes.map((n) => (
                    <Node key={n.id} label={n.label} sub={n.sub} />
                  ))}
                </div>
              </div>
              {ci < columns.length - 1 && (
                <div className="flex items-center justify-center text-[var(--fg-faint)]">
                  {/* down arrow on mobile, right arrow on desktop */}
                  <svg className="md:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                  <svg className="hidden md:block" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {mermaid && (
        <details className="group rounded-xl border border-[var(--border)] bg-[var(--fill-faint)]">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              Mermaid source
            </span>
            <svg className="chevron text-[var(--fg-subtle)] transition-transform" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className="border-t border-[var(--border)] p-3">
            <div className="mb-2 flex justify-end">
              <CopyButton text={mermaid} label="Copy Mermaid" />
            </div>
            <pre className="overflow-x-auto rounded-lg bg-[var(--bg-elev-1)] p-3 font-mono text-[12px] leading-relaxed text-[var(--fg-muted)]">
              <code>{mermaid}</code>
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
