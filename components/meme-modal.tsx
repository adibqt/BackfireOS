"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { MemeResult } from "@/lib/agents/types";
import { Badge } from "@/components/ui/badge";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { useFocusTrap } from "@/components/ui/reveal-on-scroll";
import { riskLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function MemeCard({
  meme,
  index = 0,
}: {
  meme: MemeResult;
  index?: number;
}) {
  const level = riskLevel(meme.memeabilityScore);
  const badgeVariant =
    level === "high" ? "danger" : level === "medium" ? "warning" : "success";

  return (
    <RevealOnScroll index={index}>
      <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        <div className="relative aspect-square overflow-hidden bg-[var(--bg-elev-2)]">
          <Image
            src={meme.imageUrl}
            alt={meme.caption}
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute right-3 top-3">
            <Badge variant={badgeVariant}>{Math.round(meme.memeabilityScore)}</Badge>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-[var(--text-base)] font-medium text-[var(--fg)]">{meme.caption}</p>
          <p className="mt-1 font-mono text-[var(--text-xs)] uppercase tracking-wider text-[var(--fg-subtle)]">
            Memeability {Math.round(meme.memeabilityScore)}/100
          </p>
        </div>
      </article>
    </RevealOnScroll>
  );
}

export function MemeGrid({
  memes,
  imageWarning,
  memeability,
}: {
  memes: MemeResult[];
  imageWarning?: string;
  memeability?: number;
}) {
  if (memes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-6 py-12 text-center">
        <p className="text-card-title text-[var(--fg)]">Nothing memeable here</p>
        <p className="mt-1 max-w-sm text-[var(--text-base)] text-[var(--fg-muted)]">
          {memeability != null
            ? `Memeability ${Math.round(memeability)}/100 — too low for parody mutations.`
            : "Too little parody potential to generate memes."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {imageWarning && (
        <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-[var(--text-base)] text-[var(--warning)]">
          {imageWarning}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {memes.map((meme, index) => (
          <MemeCard key={`${meme.caption}-${index}`} meme={meme} index={index} />
        ))}
      </div>
    </div>
  );
}

type MemeModalProps = {
  open: boolean;
  onClose: () => void;
  memes: MemeResult[];
  memeability?: number;
  title: string;
};

export function MemeModal({
  open,
  onClose,
  memes,
  memeability,
  title,
}: MemeModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal-backdrop)] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meme-modal-title"
        className={cn(
          "modal-panel-enter relative z-[var(--z-modal)] w-full max-w-[900px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 id="meme-modal-title" className="text-section-heading text-[var(--fg)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="max-h-[min(70vh,640px)] overflow-y-auto p-5">
          {memes.length === 0 ? (
            <p className="text-center text-[var(--text-base)] text-[var(--fg-muted)]">
              {memeability != null
                ? `Memeability ${Math.round(memeability)}/100 — no parody mutations generated.`
                : "No memes were generated for this run."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {memes.map((meme, index) => (
                <MemeCard key={`${meme.caption}-${index}`} meme={meme} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
