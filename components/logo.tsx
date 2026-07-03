import { cn } from "@/lib/utils";
import {
  BACKFIRE_B_SOLID_PATH,
  BACKFIRE_CHEVRON_PATH,
  BACKFIRE_CROSSHAIR_H,
  BACKFIRE_CROSSHAIR_V,
  BACKFIRE_RING_INNER_PATH,
  BACKFIRE_RING_PATH,
  BACKFIRE_TARGET_RING,
} from "@/lib/brand/mark-path";

/**
 * Backfire OS · Brand system (brandkit spec)
 *
 * Primary: coral-gradient B with central recoil chevron on dark surfaces.
 * App icon: white mark on coral gradient tile (pass tile to LogoBadge).
 */

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const MARK_PX: Record<Size, number> = {
  xs: 22,
  sm: 26,
  md: 32,
  lg: 40,
  xl: 52,
};

function BGlyph({ fill, maskId }: { fill: string; maskId: string }) {
  return (
    <>
      <defs>
        <mask id={maskId}>
          <rect width="32" height="32" fill="white" />
          <path d={BACKFIRE_CHEVRON_PATH} fill="black" />
        </mask>
      </defs>
      <path d={BACKFIRE_B_SOLID_PATH} fill={fill} fillRule="nonzero" mask={`url(#${maskId})`} />
    </>
  );
}

function RingGlyph({
  stroke = "currentColor",
  strokeWidth = 1.2,
  opacity = 0.45,
  d = BACKFIRE_RING_PATH,
}: {
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  d?: string;
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      opacity={opacity}
    />
  );
}

function CrosshairGlyph({ stroke = "currentColor", opacity = 0.22 }: { stroke?: string; opacity?: number }) {
  return (
    <g stroke={stroke} strokeWidth={0.75} opacity={opacity} strokeLinecap="round">
      <path d={BACKFIRE_CROSSHAIR_H} />
      <path d={BACKFIRE_CROSSHAIR_V} />
      <path d={BACKFIRE_TARGET_RING} fill="none" strokeWidth={0.85} />
    </g>
  );
}

function BrandGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="5" y1="5" x2="27" y2="27" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="var(--accent-400)" />
      <stop offset="46%" stopColor="var(--accent)" />
      <stop offset="100%" stopColor="var(--accent-700)" />
    </linearGradient>
  );
}

function TileSheen({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
      <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>
  );
}

function MarkDefs({
  gradId,
  tile,
  ring,
  ringGradId,
  sheenId,
}: {
  gradId: string;
  tile: boolean;
  ring: boolean;
  ringGradId: string;
  sheenId: string;
}) {
  return (
    <defs>
      <BrandGradient id={gradId} />
      {tile && <TileSheen id={sheenId} />}
      {ring && (
        <linearGradient id={ringGradId} x1="5" y1="5" x2="27" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--accent-400)" stopOpacity="0.75" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.15" />
        </linearGradient>
      )}
    </defs>
  );
}

function ScanOverlay({ ringGradId }: { ringGradId: string }) {
  return (
    <>
      <CrosshairGlyph stroke={`url(#${ringGradId})`} opacity={0.35} />
      <RingGlyph stroke={`url(#${ringGradId})`} opacity={0.55} strokeWidth={1.1} />
      <RingGlyph d={BACKFIRE_RING_INNER_PATH} stroke={`url(#${ringGradId})`} opacity={0.35} strokeWidth={0.8} />
    </>
  );
}

function MarkBody({
  gradId,
  tile,
  sheenId,
  maskId,
}: {
  gradId: string;
  tile: boolean;
  sheenId: string;
  maskId: string;
}) {
  if (tile) {
    return (
      <>
        <rect x="0" y="0" width="32" height="32" rx="8" fill={`url(#${gradId})`} />
        <rect x="0" y="0" width="32" height="32" rx="8" fill={`url(#${sheenId})`} />
        <BGlyph fill="#ffffff" maskId={maskId} />
      </>
    );
  }
  return <BGlyph fill={`url(#${gradId})`} maskId={maskId} />;
}

export function LogoMark({
  size = 18,
  className,
  title = "Backfire OS",
  ring = false,
}: {
  size?: number;
  className?: string;
  title?: string;
  ring?: boolean;
}) {
  const maskId = `backfire-chevron-mask-mark-${size}`;
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
      {ring && (
        <>
          <CrosshairGlyph />
          <RingGlyph strokeWidth={1} opacity={0.4} />
          <RingGlyph d={BACKFIRE_RING_INNER_PATH} strokeWidth={0.75} opacity={0.25} />
        </>
      )}
      <BGlyph fill="currentColor" maskId={maskId} />
    </svg>
  );
}

export function LogoMarkRing({
  size = 48,
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
      <defs>
        <BrandGradient id="backfire-mark-ring-grad" />
      </defs>
      <CrosshairGlyph stroke="var(--accent)" opacity={0.3} />
      <RingGlyph stroke="var(--accent)" opacity={0.5} strokeWidth={1.15} />
      <RingGlyph d={BACKFIRE_RING_INNER_PATH} stroke="var(--accent)" opacity={0.3} strokeWidth={0.85} />
      <BGlyph fill="url(#backfire-mark-ring-grad)" maskId="backfire-chevron-mask-ring" />
    </svg>
  );
}

export function LogoBadge({
  size = "md",
  className,
  glow = true,
  tile = false,
  ring = false,
}: {
  size?: Size;
  className?: string;
  glow?: boolean;
  /** App-icon treatment: white mark on coral tile. Use for favicons / browser chrome only. */
  tile?: boolean;
  /** Radar crosshair + scan arcs (brandkit construction variant). */
  ring?: boolean;
}) {
  const px = MARK_PX[size];
  const gradId = tile ? "backfire-tile-grad" : "backfire-mark-grad";
  const uid = `${gradId}-${size}`;
  const ringGradId = `backfire-ring-grad-${size}`;
  const sheenId = `backfire-tile-sheen-${size}`;
  const maskId = `backfire-chevron-mask-${size}`;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      style={glow ? { boxShadow: "var(--shadow-card)" } : undefined}
      role="img"
      aria-label="Backfire OS"
    >
      <title>Backfire OS</title>
      <MarkDefs gradId={uid} tile={tile} ring={ring} ringGradId={ringGradId} sheenId={sheenId} />
      {ring && <ScanOverlay ringGradId={ringGradId} />}
      <MarkBody gradId={uid} tile={tile} sheenId={sheenId} maskId={maskId} />
    </svg>
  );
}

export function Logo({
  size = "md",
  className,
  showWordmark = true,
  showTagline = false,
  tile = false,
  ring = false,
  glow = true,
}: {
  size?: Size;
  className?: string;
  showWordmark?: boolean;
  showTagline?: boolean;
  tile?: boolean;
  ring?: boolean;
  glow?: boolean;
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

  return (
    <div className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoBadge size={size} tile={tile} ring={ring} glow={glow} />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display font-semibold tracking-tight text-[var(--fg)] transition-colors group-hover:text-[var(--accent-400)]",
              wordSize
            )}
          >
            Backfire
            <span className="ml-1 align-[0.08em] font-mono text-[0.7em] font-medium tracking-[0.18em] text-[var(--fg-muted)]">
              OS
            </span>
          </span>
          {showTagline && (
            <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
              Adversarial brand sim
            </span>
          )}
        </div>
      )}
    </div>
  );
}
