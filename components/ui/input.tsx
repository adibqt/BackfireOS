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
  onFileChange?: (file?: File) => void;
  accept?: string;
  className?: string;
};

export function FileInput({ label, hint, onFileChange, accept, className }: FileInputProps) {
  return (
    <div>
      {label && (
        <span className="mb-1.5 block text-[13px] font-medium text-[var(--fg-muted)]">
          {label}
        </span>
      )}
      <label
        className={cn(
          "group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-lg",
          "border border-dashed border-[var(--border-strong)] bg-[var(--bg-elev-1)] px-4 py-3.5",
          "transition-all duration-200",
          "hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]",
          className
        )}
      >
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
        <input
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => onFileChange?.(e.target.files?.[0])}
        />
      </label>
      {hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}
