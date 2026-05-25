import Link from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  primary: [
    "relative isolate text-white",
    "bg-[linear-gradient(180deg,#ff5d67,#e63946)]",
    "shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset,0_-1px_0_0_rgba(0,0,0,0.25)_inset,0_8px_24px_-8px_rgba(255,77,87,0.55)]",
    "hover:brightness-110 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-1px_0_0_rgba(0,0,0,0.25)_inset,0_10px_30px_-6px_rgba(255,77,87,0.65)]",
    "active:scale-[0.98] active:brightness-95",
  ].join(" "),
  secondary: [
    "border border-[var(--border-strong)] bg-white/[0.03] text-[var(--fg)]",
    "backdrop-blur-sm",
    "hover:bg-white/[0.06] hover:border-[var(--border-bright)]",
    "active:scale-[0.98]",
  ].join(" "),
  ghost: [
    "text-[var(--fg-muted)]",
    "hover:bg-white/[0.04] hover:text-[var(--fg)]",
    "active:scale-[0.98]",
  ].join(" "),
  outline: [
    "border border-[var(--border)] bg-transparent text-[var(--fg-muted)]",
    "hover:border-[var(--accent)]/40 hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]",
    "active:scale-[0.98]",
  ].join(" "),
  danger: [
    "border border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]",
    "hover:bg-[var(--danger)]/15 hover:border-[var(--danger)]/50",
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
};

const base =
  "inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-200 select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

export function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    />
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
  ...props
}: ButtonProps) {
  const sizeMap = {
    xs: "h-7 w-7 rounded-md",
    sm: "h-8 w-8 rounded-md",
    md: "h-10 w-10 rounded-lg",
    lg: "h-12 w-12 rounded-xl",
    xl: "h-14 w-14 rounded-xl",
  } as const;
  return (
    <button
      className={cn(base, variants[variant], sizeMap[size], "p-0", className)}
      {...props}
    />
  );
}
