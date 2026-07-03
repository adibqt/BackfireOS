import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shimmer rounded-md bg-[var(--bg-elevated)]", className)}
      aria-hidden
      {...props}
    />
  );
}

export function SimpleBlockSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-11 rounded-lg", className)} />;
}

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-10", className)}>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-10 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function ListPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8", className)}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-10 w-2/3 max-w-md rounded-lg" />
        <Skeleton className="h-4 w-full max-w-lg rounded-md" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function HeatmapPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8", className)}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-9 w-2/3 max-w-lg rounded-lg" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>
      <Skeleton className="h-11 max-w-lg rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="aspect-[2/1] w-full rounded-3xl" />
    </div>
  );
}

export function FormPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-md space-y-6", className)}>
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-8">
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    </div>
  );
}
