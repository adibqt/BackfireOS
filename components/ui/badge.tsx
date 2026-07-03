import { cn } from "@/lib/utils";

const variants = {
  default:
    "bg-[var(--bg-elevated)] text-[var(--fg-muted)] border-[var(--border-strong)]",
  accent:
    "bg-[var(--accent-soft)] text-[var(--accent-400)] border-[var(--accent)]/25",
  outline:
    "bg-transparent text-[var(--fg-muted)] border-[var(--border-strong)]",
  success:
    "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]/25",
  warning:
    "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/25",
  danger:
    "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/25",
  info:
    "bg-[var(--info-soft)] text-[var(--info)] border-[var(--info)]/25",
  live:
    "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]/25",
  demo:
    "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/25",
} as const;

export function Badge({
  variant = "default",
  className,
  children,
  dot = false,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative inline-flex h-1.5 w-1.5 items-center justify-center">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-current",
              (variant === "live" || variant === "accent") && "pulse-dot"
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
}

export function RiskBadge({
  level,
  score,
  label,
}: {
  level: "low" | "medium" | "high";
  score: number;
  label?: string;
}) {
  const variant =
    level === "high" ? "danger" : level === "medium" ? "warning" : "success";

  return (
    <Badge variant={variant} className="font-mono">
      {label && `${label} `}
      {Math.round(score)}
    </Badge>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-[var(--border-strong)] bg-[var(--bg-elev-2)] px-1.5 font-mono text-[10px] font-medium text-[var(--fg-muted)]">
      {children}
    </kbd>
  );
}
