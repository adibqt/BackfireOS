import Link from "next/link";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const variants = {
  primary: [
    "relative isolate text-[var(--selection-fg)]",
    "bg-[var(--accent)]",
    "shadow-[var(--btn-primary-shadow)]",
    "hover:brightness-110 hover:scale-[1.02]",
    "active:scale-[0.98] active:brightness-95",
    "transition-[transform,filter] duration-150 ease",
  ].join(" "),
  secondary: [
    "border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--fg)]",
    "hover:bg-[var(--bg-elevated)] hover:border-[var(--border-bright)]",
    "active:scale-[0.98]",
  ].join(" "),
  ghost: [
    "text-[var(--fg-muted)]",
    "hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]",
    "active:scale-[0.98]",
  ].join(" "),
  outline: [
    "border border-[var(--border)] bg-transparent text-[var(--fg-muted)]",
    "hover:border-[var(--signal)] hover:text-[var(--signal)] hover:bg-[var(--accent-soft)]",
    "active:scale-[0.98]",
  ].join(" "),
  danger: [
    "border border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]",
    "hover:bg-[var(--danger-soft)] hover:border-[var(--danger)]",
    "active:scale-[0.98]",
  ].join(" "),
} as const;

const sizes = {
  xs: "h-7 px-2.5 text-xs rounded-md gap-1.5",
  sm: "h-8 px-3 text-sm rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-6 text-[15px] rounded-xl gap-2 font-medium",
  xl: "h-14 px-8 text-base rounded-xl gap-2.5 font-semibold tracking-tight",
} as const;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  loadingLabel?: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-200 select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

function ButtonContent({
  loading,
  loadingLabel,
  children,
}: {
  loading?: boolean;
  loadingLabel?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!loading) return <>{children}</>;
  return (
    <span className="inline-flex items-center justify-center gap-2 transition-opacity duration-150">
      <Spinner size="sm" />
      <span>{loadingLabel ?? children}</span>
    </span>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  loading,
  loadingLabel,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      <ButtonContent loading={loading} loadingLabel={loadingLabel}>
        {children}
      </ButtonContent>
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  href = "#",
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <Link
      href={href}
      className={cn(base, "no-underline", variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function IconButton({
  className,
  size = "md",
  variant = "ghost",
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const sizeMap = {
    xs: "h-7 w-7 rounded-md",
    sm: "h-8 w-8 rounded-md",
    md: "h-10 w-10 rounded-lg",
    lg: "h-12 w-12 rounded-xl",
    xl: "h-14 w-14 rounded-xl",
  } as const;
  const isDisabled = disabled || loading;
  return (
    <button
      className={cn(base, variants[variant], sizeMap[size], "p-0", className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
