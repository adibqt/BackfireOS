import { cn } from "@/lib/utils";

/**
 * Backfire OS · Brand system
 * ──────────────────────────────────────────────────────────────────────────
 * The mark is a geometric "B" monogram with a concept baked into its
 * negative space: the two counters are cut as backward-pointing arrowheads.
 * The outer silhouette reads instantly as a confident B; the carved arrows
 * read as recoil — the campaign's own force turned back on itself. Backfire.
 *
 * Built on a strict 32-unit grid for pixel-true rendering. Stem + two squircle
 * bowls fuse into one silhouette via nonzero winding; the arrow counters are
 * wound in reverse so they punch clean holes at any size.
 *
 * Components
 *   <LogoMark />   — glyph only, currentColor. Favicon / monochrome / on-color.
 *   <LogoBadge />  — the standalone brand mark (coral gradient, optional tile).
 *   <Logo />       — full lockup: mark + wordmark (+ optional tagline).
 *
 * Surface notes
 *   • The gradient mark holds up on both dark and light backgrounds.
 *   • For pure monochrome lockups use <LogoMark /> and set color via text/fill.
 *   • Pass `tile` to <LogoBadge /> for the rounded app-icon treatment.
 */

type Size = "xs" | "sm" | "md" | "lg" | "xl";

/** Pixel size of the standalone mark per named size. */
const MARK_PX: Record<Size, number> = {
  xs: 22,
  sm: 26,
  md: 32,
  lg: 40,
  xl: 52,
};

/**
 * The "B" letterform on a 32-unit grid, authored as filled subpaths:
 *   1. stem            — heavy left vertical, rounded outer corners
 *   2. top bowl        — squircle bowl, fused to the stem
 *   3. bottom bowl     — a hair wider + taller for a grounded stance
 *   4. top counter     — left-pointing arrowhead (carved)
 *   5. bottom counter  — left-pointing arrowhead (carved)
 * Subpaths 1–3 share winding (union); 4–5 reverse winding (holes).
 */
const B_PATH = [
  // stem
  "M9 6 H12.5 V26 H9 A2 2 0 0 1 7 24 V8 A2 2 0 0 1 9 6 Z",
  // top bowl
  "M10 6 H20 A4 4 0 0 1 24 10 V11 A4 4 0 0 1 20 15 H10 Z",
  // bottom bowl (a touch wider + taller)
  "M10 14 H20.5 A4.5 4.5 0 0 1 25 18.5 V21.5 A4.5 4.5 0 0 1 20.5 26 H10 Z",
  // top counter → backward arrowhead
  "M13 10.5 L19.5 12.5 L19.5 8.5 Z",
  // bottom counter → backward arrowhead
  "M13 20 L20 22.5 L20 17.5 Z",
].join(" ");

function BGlyph({ fill }: { fill: string }) {
  return <path d={B_PATH} fill={fill} fillRule="nonzero" />;
}

/** Shared coral gradient. `id` is parameterised so multiple marks coexist. */
function BrandGradient({ id }: { id: string }) {
  return (
    <linearGradient
      id={id}
      x1="7"
      y1="6"
      x2="25"
      y2="26"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0%" stopColor="#ff9aa0" />
      <stop offset="46%" stopColor="#ff4d57" />
      <stop offset="100%" stopColor="#c0212e" />
    </linearGradient>
  );
}

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
      <BGlyph fill="currentColor" />
    </svg>
  );
}

export function LogoBadge({
  size = "md",
  className,
  glow = true,
  tile = false,
}: {
  size?: Size;
  className?: string;
  glow?: boolean;
  /** Render the rounded app-icon treatment: white mark on a gradient tile. */
  tile?: boolean;
}) {
  const px = MARK_PX[size];
  const gradId = tile ? "backfire-tile-grad" : "backfire-mark-grad";

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      style={
        glow
          ? { filter: "drop-shadow(0 3px 10px var(--accent-glow))" }
          : undefined
      }
      role="img"
      aria-label="Backfire OS"
    >
      <title>Backfire OS</title>
      <defs>
        <BrandGradient id={gradId} />
      </defs>
      {tile ? (
        <>
          <rect x="0" y="0" width="32" height="32" rx="8" fill={`url(#${gradId})`} />
          {/* subtle top-edge sheen for the app-icon read */}
          <rect
            x="0"
            y="0"
            width="32"
            height="32"
            rx="8"
            fill="url(#backfire-tile-sheen)"
          />
          <defs>
            <linearGradient
              id="backfire-tile-sheen"
              x1="16"
              y1="0"
              x2="16"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <BGlyph fill="#ffffff" />
        </>
      ) : (
        <BGlyph fill={`url(#${gradId})`} />
      )}
    </svg>
  );
}

export function Logo({
  size = "md",
  className,
  showWordmark = true,
  showTagline = false,
  tile = false,
  href,
}: {
  size?: Size;
  className?: string;
  showWordmark?: boolean;
  showTagline?: boolean;
  tile?: boolean;
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
    <div className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoBadge size={size} tile={tile} />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display font-semibold tracking-tight text-[var(--fg)] transition-colors group-hover:text-[var(--accent-400)]",
              wordSize
            )}
          >
            Backfire
            <span className="ml-1 font-mono text-[0.7em] font-medium tracking-[0.18em] text-[var(--fg-muted)] align-[0.08em]">
              OS
            </span>
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
