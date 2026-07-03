"use client";

import { cn } from "@/lib/utils";

type CollapsibleProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
};

export function Collapsible({
  label,
  children,
  className,
  defaultOpen = false,
}: CollapsibleProps) {
  return (
    <details
      className={cn(
        "group rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]",
        className
      )}
      open={defaultOpen || undefined}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-[var(--text-sm)] font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]">
        <span className="flex items-center justify-between gap-2">
          {label}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="chevron shrink-0 text-[var(--fg-subtle)] transition-transform duration-300"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </summary>
      <div className="collapsible-content border-t border-[var(--border)] px-4 py-3 text-[var(--text-base)] leading-[var(--leading-normal)] text-[var(--fg-muted)]">
        {children}
      </div>
    </details>
  );
}
