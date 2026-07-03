"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { MemeResult } from "@/lib/agents/types";
import { useFocusTrap } from "@/components/ui/reveal-on-scroll";
import { prefersReducedMotion } from "@/hooks/use-scroll-progress";
import { cn } from "@/lib/utils";

export function MemeCard({
  meme,
}: {
  meme: MemeResult;
}) {
  return (
    <article>
      <div className="relative aspect-square overflow-hidden bg-[var(--bg-inset)]">
        <Image
          src={meme.imageUrl}
          alt={meme.caption}
          fill
          unoptimized
          className="object-cover"
        />
      </div>
      <div className="mt-4">
        <p className="text-[var(--text-md)] text-[var(--ink-primary)]">{meme.caption}</p>
        <span className="mt-2 inline-block rounded-sm border border-[var(--hairline)] bg-[var(--bg-inset)] px-2 py-1 font-mono text-[var(--text-xs)] text-[var(--ink-tertiary)]">
          {Math.round(meme.memeabilityScore)}/100
        </span>
      </div>
    </article>
  );
}

export function MemeGrid({
  memes,
  memeability,
}: {
  memes: MemeResult[];
  memeability?: number;
}) {
  if (memes.length === 0) {
    return (
      <p className="text-center text-[var(--text-base)] text-[var(--ink-secondary)]">
        {memeability != null
          ? `Memeability ${Math.round(memeability)}/100 — no parody mutations generated.`
          : "No memes were generated for this run."}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {memes.map((meme, index) => (
        <MemeCard key={`${meme.caption}-${index}`} meme={meme} />
      ))}
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
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  useFocusTrap(open, panelRef);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (open) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), reduced ? 0 : 600);
      return () => clearTimeout(t);
    }
  }, [open, reduced]);

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

  if (!open && !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal-backdrop)] flex items-center justify-center p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={cn(
          "absolute inset-0 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: "rgba(15, 14, 12, 0.94)",
          transitionDuration: "var(--dur-fast)",
        }}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meme-modal-title"
        className={cn(
          "relative z-[var(--z-modal)] w-full max-w-[960px] overflow-y-auto border border-[var(--hairline)] bg-[var(--bg-elevated)]",
          !reduced && "transition-[transform,opacity]",
          open ? "opacity-100" : "opacity-0",
          !reduced && (open ? "scale-100" : "scale-[0.96]")
        )}
        style={{
          maxHeight: "85vh",
          padding: "48px",
          borderRadius: "4px",
          transitionDuration: "var(--dur-mid)",
          transitionTimingFunction: "var(--ease-out-expo)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-8 flex items-start justify-between gap-4">
          <h2
            id="meme-modal-title"
            className="font-display text-[var(--text-2xl)] font-medium text-[var(--ink-primary)]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[var(--text-xl)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink-primary)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <MemeGrid memes={memes} memeability={memeability} />
      </div>
    </div>
  );
}
