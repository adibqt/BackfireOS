import type { AgentVerdict } from "@/lib/agents/types";
import { riskLevel } from "@/lib/scoring";

export function AgentVerdictCard({
  verdict,
  labels,
}: {
  verdict: AgentVerdict;
  labels: { severity: string; reasoning: string; sampleAttack: string };
}) {
  const level = riskLevel(verdict.severity);
  const badge =
    level === "high"
      ? "bg-red-600/20 text-red-300"
      : level === "medium"
        ? "bg-amber-600/20 text-amber-300"
        : "bg-emerald-600/20 text-emerald-300";

  return (
    <details className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">{verdict.agentName}</h3>
            <p className="text-xs text-zinc-500">{verdict.agentId}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${badge}`}>
            {labels.severity}: {verdict.severity}
          </span>
        </div>
      </summary>
      <div className="mt-4 space-y-3 text-sm text-zinc-300">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
            {labels.reasoning}
          </p>
          <p>{verdict.reasoning}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
            {labels.sampleAttack}
          </p>
          <p className="rounded-lg bg-black/30 p-3 font-mono text-red-200">
            {verdict.sampleAttack}
          </p>
        </div>
        {verdict.citationIds.length > 0 && (
          <p className="text-xs text-zinc-500">
            RAG citations: {verdict.citationIds.join(", ")}
          </p>
        )}
      </div>
    </details>
  );
}
