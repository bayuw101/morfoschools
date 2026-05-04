import type { ReactNode } from "react";
import { Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type FieldShellProps = {
  label: string;
  active?: boolean;
  filled?: boolean;
  multiline?: boolean;
  disabled?: boolean;
  valid?: boolean;
  error?: string;
  helperText?: string;
  leading?: ReactNode;
  suffix?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FieldShell({
  label,
  active = false,
  filled = false,
  multiline = false,
  disabled = false,
  valid = false,
  error,
  helperText,
  leading,
  suffix,
  children,
  className,
}: FieldShellProps) {
  const floatLabel = active || filled;

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative rounded-2xl border-2 bg-[color:var(--surface)] transition-all duration-200",
          !multiline && "min-h-[62px]",
          active
            ? "border-[color:var(--brand)] shadow-[0_0_0_3px_rgba(58,96,148,0.12)]"
            : error
              ? "border-[color:var(--danger)] bg-[color:var(--danger-soft)]"
              : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
          disabled && "cursor-not-allowed opacity-70",
          className,
        )}
      >
        {leading ? (
          <div
            className={cn(
              "pointer-events-none absolute left-2.5 flex items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--muted-foreground)] transition-colors",
              multiline ? "top-3.5 h-8 w-8" : "inset-y-2.5 w-10",
              active && "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]",
              error && "border-[color:var(--danger)] bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
            )}
          >
            {leading}
          </div>
        ) : null}

        {children}
        <label
          className={cn(
            "pointer-events-none absolute select-none text-sm transition-all duration-200",
            leading ? "left-16" : "left-4",
            multiline
              ? floatLabel
                ? "top-2 text-[11px] font-semibold"
                : "top-5 text-sm font-medium"
              : floatLabel
                ? "top-2.5 text-[11px] font-semibold"
                : "top-1/2 -translate-y-1/2 text-sm font-medium",
            error ? "text-[color:var(--danger)]" : "text-[color:var(--muted-foreground)]",
          )}
        >
          {label}
        </label>

        {suffix ? (
          <div
            className={cn(
              "pointer-events-none absolute right-2.5 flex items-center justify-center",
              multiline ? "top-3.5 h-8 w-8" : "inset-y-2.5 w-10",
            )}
          >
            <div className="flex h-full w-full items-center justify-center rounded-xl text-[color:var(--muted-foreground)]">
              {suffix}
            </div>
          </div>
        ) : valid ? (
          <div
            className={cn(
              "pointer-events-none absolute right-2.5 flex items-center justify-center",
              multiline ? "top-3.5 h-8 w-8" : "inset-y-2.5 w-10",
            )}
          >
            <div className="flex h-full w-full items-center justify-center rounded-xl text-[color:var(--success)]">
              <Check className="h-4 w-4" strokeWidth={2.6} />
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 pl-1 text-xs font-medium text-[color:var(--danger)]">
          <CircleAlert className="h-3.5 w-3.5" />
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1.5 pl-1 text-xs text-[color:var(--muted-foreground)]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
