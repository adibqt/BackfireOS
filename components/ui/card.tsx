import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  glow?: boolean;
  interactive?: boolean;
  bleed?: boolean;
};

export function Card({
  className,
  children,
  glow = false,
  interactive = false,
  bleed = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-[var(--border)]",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))]",
        "backdrop-blur-xl",
        glow && "card-glow",
        interactive && "lift cursor-pointer",
        bleed && "overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-[var(--border)] px-6 py-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-display text-base font-semibold tracking-tight text-[var(--fg)]",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-[var(--fg-muted)]", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-wrap items-end justify-between gap-4",
        align === "center" && "flex-col items-center text-center",
        className
      )}
    >
      <div className={cn(align === "center" && "mx-auto max-w-2xl")}>
        {eyebrow && (
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-6 bg-[var(--accent)]/60" />
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--fg)] md:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
            {description}
          </p>
        )}
      </div>
      {action && align !== "center" && action}
    </div>
  );
}
