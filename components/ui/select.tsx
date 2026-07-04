"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const fieldSizes = {
  sm: "min-h-9 py-1.5 pl-3 pr-9 text-[13px] rounded-lg",
  md: "min-h-11 py-2 pl-3.5 pr-10 text-[15px] rounded-lg",
  lg: "min-h-[44px] py-2.5 pl-4 pr-10 text-[14px] rounded-xl",
} as const;

const triggerBase =
  "flex w-full items-center justify-between gap-2 border border-[var(--border-strong)] bg-[var(--bg-elev-1)] text-left text-[var(--fg)] " +
  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] " +
  "transition-[border-color,box-shadow,background-color] duration-200 " +
  "hover:border-[var(--border-bright)] hover:bg-[var(--bg-elev-2)]/90 " +
  "focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:bg-[var(--bg-elev-2)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

type ParsedOption = {
  value: string;
  label: string;
  disabled?: boolean;
  placeholder?: boolean;
};

type ParsedGroup = {
  label?: string;
  options: ParsedOption[];
};

function childText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(childText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return childText(node.props.children);
  return "";
}

function parseSelectChildren(children: ReactNode): ParsedGroup[] {
  const groups: ParsedGroup[] = [];

  const pushOption = (groupLabel: string | undefined, option: ParsedOption) => {
    if (groupLabel) {
      const existing = groups.find((g) => g.label === groupLabel);
      if (existing) existing.options.push(option);
      else groups.push({ label: groupLabel, options: [option] });
      return;
    }
    const last = groups[groups.length - 1];
    if (last && !last.label) last.options.push(option);
    else groups.push({ options: [option] });
  };

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === "option") {
      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement> & {
        children?: ReactNode;
      };
      const rawValue = props.value ?? "";
      const value = Array.isArray(rawValue) ? rawValue.join(",") : String(rawValue);
      pushOption(undefined, {
        value,
        label: childText(props.children) || value,
        disabled: props.disabled,
        placeholder: value === "",
      });
      return;
    }

    if (child.type === "optgroup") {
      const props = child.props as React.OptgroupHTMLAttributes<HTMLOptionElement> & {
        children?: ReactNode;
      };
      Children.forEach(props.children, (optChild) => {
        if (!isValidElement(optChild) || optChild.type !== "option") return;
        const optProps = optChild.props as React.OptionHTMLAttributes<HTMLOptionElement> & {
          children?: ReactNode;
        };
        const rawValue = optProps.value ?? "";
        const value = Array.isArray(rawValue) ? rawValue.join(",") : String(rawValue);
        pushOption(props.label, {
          value,
          label: childText(optProps.children) || value,
          disabled: optProps.disabled,
          placeholder: value === "",
        });
      });
    }
  });

  return groups;
}

function flattenGroups(groups: ParsedGroup[]) {
  return groups.flatMap((g) => g.options);
}

function listOptions(groups: ParsedGroup[]) {
  return flattenGroups(groups).filter((o) => !o.placeholder);
}

function SelectChevron({ open, className }: { open?: boolean; className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "shrink-0 text-[var(--fg-subtle)] transition-transform duration-200",
        open && "rotate-180 text-[var(--fg-muted)]",
        className
      )}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

type SelectProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onChange" | "children" | "size"
> & {
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  children: ReactNode;
  label?: string;
  hint?: string;
  error?: string;
  fieldSize?: keyof typeof fieldSizes;
  wrapperClassName?: string;
  name?: string;
};

export function Select({
  label,
  hint,
  error,
  fieldSize = "md",
  className,
  wrapperClassName,
  id,
  children,
  value = "",
  onChange,
  disabled,
  title,
  name,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, width: 0 });

  const groups = parseSelectChildren(children);
  const allOptions = flattenGroups(groups);
  const selectable = listOptions(groups);
  const placeholderOption = allOptions.find((o) => o.placeholder);
  const selected = allOptions.find((o) => o.value === value && !o.placeholder);
  const displayLabel =
    selected?.label ?? placeholderOption?.label ?? (value ? value : "Select…");

  const updatePanelPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPanelStyle({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, value, fieldSize]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePanelPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) setHighlight(-1);
  }, [open]);

  const pick = (nextValue: string) => {
    onChange?.({ target: { value: nextValue } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        const idx = selectable.findIndex((o) => o.value === value);
        setHighlight(idx >= 0 ? idx : 0);
        return;
      }
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((i) => Math.min(i + 1, selectable.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setHighlight(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHighlight(selectable.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = selectable[highlight];
      if (option && !option.disabled) pick(option.value);
    }
  };

  useEffect(() => {
    if (!open || highlight < 0) return;
    panelRef.current
      ?.querySelector<HTMLElement>(`[data-option-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const trigger = (
    <div className={cn("relative", wrapperClassName)}>
      {name ? <input type="hidden" name={name} value={value} readOnly /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        title={title}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          triggerBase,
          fieldSizes[fieldSize],
          error && "border-[var(--danger)]/60 focus-visible:border-[var(--danger)] focus-visible:ring-[var(--danger)]/20",
          open && "border-[var(--accent)] ring-2 ring-[var(--accent-ring)] bg-[var(--bg-elev-2)]",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selected && "text-[var(--fg-faint)]"
          )}
        >
          {displayLabel}
        </span>
        <SelectChevron open={open} />
      </button>

      {mounted &&
        open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[var(--z-dropdown-backdrop,60)]"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={selectId}
              style={{
                position: "fixed",
                top: panelStyle.top,
                left: panelStyle.left,
                width: panelStyle.width,
              }}
              className="select-panel z-[var(--z-dropdown,70)] max-h-[min(320px,50vh)] overflow-y-auto py-1.5"
            >
              {groups.map((group, groupIndex) => (
                <div key={group.label ?? groupIndex}>
                  {group.label ? (
                    <p className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-elev-2)]/95 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)] backdrop-blur-sm">
                      {group.label}
                    </p>
                  ) : null}
                  {group.options
                    .filter((o) => !o.placeholder)
                    .map((option) => {
                      const optionIndex = selectable.findIndex((o) => o.value === option.value);
                      const isSelected = option.value === value;
                      const isHighlighted = optionIndex === highlight;

                      return (
                        <button
                          key={`${group.label ?? "default"}-${option.value}`}
                          type="button"
                          role="option"
                          data-option-index={optionIndex}
                          aria-selected={isSelected}
                          disabled={option.disabled}
                          onMouseEnter={() => setHighlight(optionIndex)}
                          onClick={() => {
                            if (!option.disabled) pick(option.value);
                          }}
                          className={cn(
                            "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-[13px] leading-snug transition-colors duration-150 outline-none",
                            "disabled:cursor-not-allowed disabled:opacity-40",
                            isSelected
                              ? "bg-[var(--accent-soft)] text-[var(--accent-400)]"
                              : isHighlighted
                                ? "bg-[var(--fill-hover)] text-[var(--fg)]"
                                : "text-[var(--fg-muted)] hover:bg-[var(--fill-hover)] hover:text-[var(--fg)]"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                              isSelected
                                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                : "border-[var(--border-strong)] bg-transparent"
                            )}
                            aria-hidden
                          >
                            {isSelected ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1 break-words">{option.label}</span>
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  );

  if (!label && !hint && !error) return trigger;

  return (
    <div>
      {label ? (
        <label htmlFor={selectId} className="mb-1.5 block text-[13px] font-medium text-[var(--fg-muted)]">
          {label}
        </label>
      ) : null}
      {trigger}
      {error ? (
        <p className="mt-1.5 text-xs text-[var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[var(--fg-subtle)]">{hint}</p>
      ) : null}
    </div>
  );
}

/** @deprecated Native select styling helper; custom Select no longer uses this. */
export const selectFieldBase = triggerBase;
