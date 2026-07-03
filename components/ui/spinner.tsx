import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

export function Spinner({
  size = "md",
  className,
  ...props
}: React.SVGAttributes<SVGSVGElement> & {
  size?: keyof typeof sizes;
}) {
  return (
    <svg
      className={cn("animate-spin shrink-0", sizes[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
