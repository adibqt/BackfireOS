import type { MemeResult } from "@/lib/agents/types";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { riskLevel } from "@/lib/scoring";

export function MemeGrid({
  memes,
  imageWarning,
}: {
  memes: MemeResult[];
  imageWarning?: string;
}) {
  return (
    <div className="space-y-4">
      {imageWarning && (
        <div className="flex gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{imageWarning}</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {memes.map((meme, index) => {
          const level = riskLevel(meme.memeabilityScore);
          const badgeVariant =
            level === "high" ? "danger" : level === "medium" ? "warning" : "success";

          return (
            <article
              key={`${meme.caption}-${index}`}
              className="card-glow group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)] fade-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="relative aspect-square overflow-hidden bg-[var(--bg-elev-2)]">
                <Image
                  src={meme.imageUrl}
                  alt={meme.caption}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                {!meme.imageFallback && (
                  <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-12">
                    <p className="text-center text-[13px] font-semibold leading-snug text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      {meme.caption}
                    </p>
                  </div>
                )}
                <div className="absolute right-3 top-3">
                  <Badge variant={badgeVariant} className="backdrop-blur-md">
                    {Math.round(meme.memeabilityScore)}
                  </Badge>
                </div>
              </div>
              <div className="border-t border-[var(--border)] px-4 py-3">
                {meme.imageFallback && (
                  <p className="mb-1 text-[13px] font-medium text-[var(--fg)]">{meme.caption}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                    Memeability
                  </p>
                  <p className="font-mono text-[11px] text-[var(--fg-muted)]">
                    {Math.round(meme.memeabilityScore)}/100
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
