"use client";

import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function applyTheme(next: "dark" | "light") {
  if (next === "light") {
    document.documentElement.dataset.theme = "light";
  } else {
    delete document.documentElement.dataset.theme;
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* private mode: preference just won't persist */
  }
}

/**
 * Icon visibility is CSS-driven (.dark-only / .light-only react to
 * html[data-theme]), so this renders identically on server and client and
 * needs no mount state.
 */
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const isLight = document.documentElement.dataset.theme === "light";
        applyTheme(isLight ? "dark" : "light");
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elev-1)]/60 text-[var(--fg-muted)] backdrop-blur",
        "transition-colors hover:bg-[var(--fill-hover)] hover:text-[var(--fg)]",
        className
      )}
      aria-label="Toggle color theme"
      title="Toggle color theme"
    >
      {/* Sun — shown in dark mode (click for light) */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dark-only"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      {/* Moon — shown in light mode (click for dark) */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="light-only"
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
