import { cn } from "@/lib/utils";

/**
 * Backfire OS · Logo system
 *
 * The mark: a custom monogram "B" constructed from two opposing chevrons
 * sharing a vertical spine. The top chevron points outward (campaign
 * launching); the bottom chevron points back inward (the backfire returning).
 * A spark notch at the inflection point marks the moment of misfire.
 *
 * Built on a precise 32-unit grid — every coordinate is an integer for
 * pixel-perfect rendering at favicon scale.
 *
 * Components:
 *   <LogoMark />       — icon only, currentColor-driven
 *   <LogoBadge />      — icon inside a rounded coral-gradient tile
 *   <Logo />           — full lockup: badge + wordmark
 */

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const BADGE_SIZE: Record<Size, string> = {
  xs: "h-6 w-6 rounded-md",
  sm: "h-7 w-7 rounded-lg",
  md: "h-9 w-9 rounded-xl",
  lg: "h-11 w-11 rounded-xl",
  xl: "h-14 w-14 rounded-2xl",
};

const MARK_SIZE: Record<Size, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 22,
  xl: 28,
};

export function LogoMark({
  size = 18,
  className,
  title = "Backfire OS",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Vertical spine — the constant axis */}
      <rect x="6" y="4" width="4" height="24" rx="1.25" fill="currentColor" />

      {/* Top chevron — campaign launching outward (points right) */}
      <path
        d="M10 4 L19 4 L26 11 L19 18 L10 18 Z"
        fill="currentColor"
      />

      {/* Spark notch — the misfire inflection point */}
      <path
        d="M10 14 L14 16 L10 18 Z"
        fill="var(--bg, #0a0809)"
      />

      {/* Bottom chevron — the recoil returning inward (mirrored, slightly bolder) */}
      <path
        d="M10 14 L20 14 L27 21 L20 28 L10 28 Z"
        fill="currentColor"
      />

      {/* Inner recoil cut — negative space sliver suggesting the blast direction */}
      <path
        d="M14 17 L21 21 L14 25 Z"
        fill="var(--bg, #0a0809)"
        opacity="0.55"
      />
    </svg>
  );
}

export function LogoBadge({
  size = "md",
  className,
  glow = true,
}: {
  size?: Size;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center text-white",
        "bg-[linear-gradient(135deg,#ff7a82_0%,#ff4d57_45%,#c92c39_100%)]",
        "ring-1 ring-inset ring-white/15",
        glow && "shadow-[0_6px_24px_-6px_var(--accent-glow)]",
        BADGE_SIZE[size],
        className
      )}
      aria-hidden
    >
      {/* Top inner highlight for depth */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_45%)]"
      />
      <LogoMark size={MARK_SIZE[size]} className="relative" />
    </div>
  );
}

export function Logo({
  size = "md",
  className,
  showWordmark = true,
  showTagline = false,
  href,
}: {
  size?: Size;
  className?: string;
  showWordmark?: boolean;
  showTagline?: boolean;
  href?: string;
}) {
  const wordSize =
    size === "xl"
      ? "text-[20px]"
      : size === "lg"
      ? "text-[17px]"
      : size === "sm"
      ? "text-[14px]"
      : size === "xs"
      ? "text-[12px]"
      : "text-[15px]";

  const content = (
    <div className={cn("group inline-flex items-center gap-3", className)}>
      <LogoBadge size={size} />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display font-semibold tracking-tight text-[var(--fg)] transition-colors group-hover:text-[var(--accent-400)]",
              wordSize
            )}
          >
            Backfire <span className="text-[var(--fg-muted)] font-medium">OS</span>
          </span>
          {showTagline && (
            <span className="mt-1.5 text-[11px] leading-none text-[var(--fg-subtle)]">
              Adversarial brand sim
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    // Caller wraps in next/link — return the inner content
    return content;
  }
  return content;
}
