"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  contentId: string;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenu components must be used within DropdownMenu");
  return ctx;
}

type DropdownMenuProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
};

export function DropdownMenu({
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };
  const triggerId = useId();
  const contentId = useId();

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerId, contentId }}>
      <div className={cn("relative", className)}>{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, triggerId, contentId } = useDropdownMenu();

  return (
    <button
      type="button"
      id={triggerId}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={() => setOpen(!open)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

type DropdownMenuContentProps = {
  children: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
  width?: string;
  /** Fixed panel on small viewports (e.g. header account menu). */
  mobileFixed?: boolean;
};

export function DropdownMenuContent({
  children,
  className,
  align = "end",
  width = "w-56",
  mobileFixed = false,
}: DropdownMenuContentProps) {
  const { open, setOpen, triggerId, contentId } = useDropdownMenu();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const alignClass =
    align === "start"
      ? "sm:left-0 sm:right-auto"
      : align === "center"
        ? "sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
        : "sm:right-0 sm:left-auto";

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
      <div
        id={contentId}
        role="menu"
        aria-labelledby={triggerId}
        className={cn(
          "dropdown-panel z-50 overflow-hidden",
          width,
          mobileFixed
            ? cn("fixed right-5 top-[3.75rem] sm:absolute sm:top-[calc(100%+8px)]", alignClass)
            : cn("absolute top-[calc(100%+8px)]", alignClass),
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

export function DropdownMenuHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-[var(--border)] px-3.5 py-3", className)}>{children}</div>
  );
}

export function DropdownMenuLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]", className)}>
      {children}
    </p>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn("my-1 h-px bg-[var(--border)]", className)} />;
}

type DropdownMenuItemProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "danger";
  onSelect?: () => void;
};

const itemBase =
  "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] transition-colors duration-150 outline-none";

const itemVariants = {
  default: "text-[var(--fg-muted)] hover:bg-[var(--fill-hover)] hover:text-[var(--fg)] focus-visible:bg-[var(--fill-hover)] focus-visible:text-[var(--fg)]",
  danger:
    "text-[var(--danger)] hover:bg-[var(--danger-soft)] focus-visible:bg-[var(--danger-soft)]",
} as const;

export function DropdownMenuItem({
  children,
  className,
  variant = "default",
  onSelect,
  onClick,
  ...props
}: DropdownMenuItemProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useDropdownMenu();

  return (
    <button
      type="button"
      role="menuitem"
      className={cn(itemBase, itemVariants[variant], className)}
      onClick={(e) => {
        onClick?.(e);
        onSelect?.();
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLink({
  href,
  children,
  className,
  variant = "default",
  onClick,
  ...props
}: DropdownMenuItemProps & React.ComponentProps<typeof Link>) {
  const { setOpen } = useDropdownMenu();

  return (
    <Link
      href={href}
      role="menuitem"
      className={cn(itemBase, itemVariants[variant], className)}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
