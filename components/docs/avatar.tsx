import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic hue from the name so the fallback avatar is stable & uniform.
function hue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

const SIZES = {
  md: "h-16 w-16 text-base",
  lg: "h-20 w-20 text-lg",
} as const;

/**
 * Uniform team avatar: fixed square aspect ratio, consistent ring + frame.
 * Renders the supplied image when present (object-cover keeps dimensions uniform),
 * otherwise a deterministic initials fallback — no network dependency.
 */
export function Avatar({
  name,
  src,
  size = "lg",
  className,
}: {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const h = hue(name);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        "ring-1 ring-inset ring-[var(--border-strong)]",
        "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]",
        SIZES[size],
        className
      )}
      style={
        src
          ? undefined
          : {
              backgroundImage: `linear-gradient(135deg, hsl(${h} 70% 32%), hsl(${(h + 40) % 360} 65% 20%))`,
            }
      }
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-display font-semibold tracking-tight text-white/90">
          {initials(name)}
        </span>
      )}
    </span>
  );
}
