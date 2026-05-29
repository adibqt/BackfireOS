import { FEATURE_MATRIX, type FeatureStatus } from "@/lib/docs/content";

const STATUS_META: Record<FeatureStatus, { label: string; cls: string; dot: string }> = {
  live: {
    label: "Live",
    cls: "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]",
    dot: "bg-[var(--success)]",
  },
  in_progress: {
    label: "In progress",
    cls: "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]",
    dot: "bg-[var(--warning)]",
  },
  planned: {
    label: "Planned",
    cls: "border-[var(--info)]/25 bg-[var(--info-soft)] text-[var(--info)]",
    dot: "bg-[var(--info)]",
  },
  experimental: {
    label: "Experimental",
    cls: "border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[var(--accent-400)]",
    dot: "bg-[var(--accent)]",
  },
};

export function FeatureMatrix() {
  const categories = [...new Set(FEATURE_MATRIX.map((f) => f.category))];
  const liveCount = FEATURE_MATRIX.filter((f) => f.status === "live").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/25 bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--success)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] pulse-dot" />
          {liveCount} features live in `main`
        </span>
        {(Object.keys(STATUS_META) as FeatureStatus[]).map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 text-[11px] text-[var(--fg-subtle)]"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot}`} />
            {STATUS_META[s].label}
          </span>
        ))}
      </div>

      <div className="space-y-5">
        {categories.map((cat) => (
          <div key={cat}>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              {cat}
            </p>
            <div className="space-y-1.5">
              {FEATURE_MATRIX.filter((f) => f.category === cat).map((f) => {
                const meta = STATUS_META[f.status];
                return (
                  <div
                    key={f.feature}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-white/[0.012] px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] text-[var(--fg)]">{f.feature}</p>
                      <p className="truncate font-mono text-[11px] text-[var(--fg-faint)]">{f.notes}</p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.cls}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
