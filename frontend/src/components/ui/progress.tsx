import { cn } from "@/lib/cn";

type ProgressProps = {
  value: number;
  label?: string;
  helperText?: string;
  className?: string;
};

export function Progress({ value, label, helperText, className }: ProgressProps) {
  const boundedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("space-y-1.5", className)}>
      {label || helperText ? (
        <div className="flex items-end justify-between gap-3">
          <div>
            {label ? (
              <p className="text-sm font-semibold text-[color:var(--foreground)]">{label}</p>
            ) : null}
            {helperText ? (
              <p className="text-xs leading-5 text-[color:var(--muted-foreground)]">{helperText}</p>
            ) : null}
          </div>
          <p className="text-xs font-semibold text-[color:var(--brand-strong)]">
            {boundedValue}%
          </p>
        </div>
      ) : null}

      <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-subtle)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#496d9e_0%,#29486f_100%)] transition-[width] duration-300"
          style={{ width: `${boundedValue}%` }}
        />
      </div>
    </div>
  );
}
