"use client";

import Link from "next/link";
import { useNavigationProgress } from "@/components/navigation-progress";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

export function PendingButtonLink({
  href,
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof ButtonLink>) {
  const { startNavigation } = useNavigationProgress();
  return (
    <ButtonLink
      href={href}
      className={className}
      onClick={(e) => {
        startNavigation();
        onClick?.(e);
      }}
      {...props}
    />
  );
}

export function PendingNavLink({
  href,
  className,
  children,
  onClick,
  ...props
}: React.ComponentProps<typeof Link>) {
  const { startNavigation } = useNavigationProgress();
  return (
    <Link
      href={href}
      className={cn(className)}
      onClick={(e) => {
        startNavigation();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
