import { useRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

const fieldBase =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elev-1)] px-3.5 text-[15px] text-[var(--fg)] " +
  "placeholder:text-[var(--fg-faint)] " +
  "transition-[border-color,box-shadow,background-color] duration-200 " +
  "hover:border-[var(--border-bright)] " +
  "focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:bg-[var(--bg-elev-2)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[13px] font-medium text-[var(--fg-muted)]"
    >
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-[var(--fg-subtle)]">{children}</p>;
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-[var(--danger)]">{children}</p>;
}

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <input
        id={inputId}
        className={cn(fieldBase, "h-11", error && "border-[var(--danger)]/60", className)}
        {...props}
      />
      {error ? <FieldError>{error}</FieldError> : hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Textarea({ label, hint, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <textarea
        id={inputId}
        className={cn(
          fieldBase,
          "resize-y py-2.5 leading-relaxed",
          error && "border-[var(--danger)]/60",
          className
        )}
        {...props}
      />
      {error ? <FieldError>{error}</FieldError> : hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

type FileInputProps = {
  label?: string;
  hint?: string;
  previewUrl?: string;
  onFileChange?: (file?: File) => void;
  onClear?: () => void;
  accept?: string;
  className?: string;
};

export function FileInput({ label, hint, previewUrl, onFileChange, onClear, accept, className }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  };

  return (
    <div>
      {label && (
        <span className="mb-1.5 block text-[13px] font-medium text-[var(--fg-muted)]">
          {label}
        </span>
      )}
      <div className="relative">
        <label
          className={cn(
            "group relative flex cursor-pointer overflow-hidden rounded-lg",
            "border border-dashed border-[var(--border-strong)] bg-[var(--bg-elev-1)]",
            "transition-all duration-200",
            previewUrl
              ? "block"
              : "items-center gap-3 px-4 py-3.5 hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]",
            className
          )}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Upload preview"
                className="max-h-52 w-full object-contain"
              />
              <div
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center gap-1",
                  "bg-black/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-white">Click to change</span>
              </div>
            </>
          ) : (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)] transition-transform duration-300 group-hover:scale-110">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <span className="text-sm text-[var(--fg-muted)]">
                <span className="font-medium text-[var(--fg)]">Click to upload</span> or drag and drop
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => onFileChange?.(e.target.files?.[0])}
          />
        </label>
        {previewUrl && onClear && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Remove image"
            className={cn(
              "absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-md",
              "border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--text-primary)_70%,transparent)] text-[var(--selection-fg)] shadow-sm",
              "transition-colors duration-200 hover:bg-[var(--danger)] hover:border-[var(--danger)]/50"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      {hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}
