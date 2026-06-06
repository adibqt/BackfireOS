"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOutUser, useAuthUser } from "@/components/use-auth-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLink,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function AuthButton() {
  const router = useRouter();
  const { user, loading, configured } = useAuthUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/login");
    router.refresh();
  };

  if (!configured) return null;

  if (loading) {
    return <span className="h-9 w-20 shimmer rounded-lg" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className={cn(
          "hidden h-9 items-center rounded-lg border border-[var(--border-strong)] bg-white/[0.03] px-3.5 text-[13px] font-medium text-[var(--fg)] backdrop-blur",
          "transition-colors hover:bg-white/[0.06] hover:border-[var(--border-bright)] sm:inline-flex"
        )}
      >
        Sign in
      </Link>
    );
  }

  const initial = (user.email?.[0] ?? "u").toUpperCase();

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger
        className={cn(
          "flex h-9 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-elev-1)]/60 py-0.5 pl-0.5 pr-1.5 backdrop-blur",
          "transition-[border-color,background-color,box-shadow] duration-200",
          "hover:border-[var(--border-bright)] hover:bg-white/[0.06]",
          menuOpen && "border-[var(--border-bright)] bg-white/[0.06] ring-2 ring-[var(--accent-ring)]",
          "sm:pr-3"
        )}
        aria-label={menuOpen ? "Close account menu" : "Open account menu"}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7a82,#c92c39)] text-[12px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(255,77,87,0.5)]">
          {initial}
        </span>
        <span className="hidden max-w-[120px] truncate text-[13px] text-[var(--fg)] sm:inline">
          {user.email}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={cn(
            "hidden text-[var(--fg-subtle)] transition-transform duration-200 sm:block",
            menuOpen && "rotate-180 text-[var(--fg-muted)]"
          )}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </DropdownMenuTrigger>

      <DropdownMenuContent mobileFixed width="w-60">
        <DropdownMenuHeader>
          <DropdownMenuLabel>Signed in</DropdownMenuLabel>
          <p className="mt-0.5 truncate text-[13px] font-medium text-[var(--fg)]">{user.email}</p>
        </DropdownMenuHeader>

        <div className="py-1">
          <DropdownMenuLink href="/history">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Simulation history
          </DropdownMenuLink>

          <DropdownMenuItem variant="danger" onSelect={handleSignOut}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
