import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  size?: "default" | "compact";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  size = "default",
}: SectionHeadingProps) {
  const compact = size === "compact";

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:justify-between",
        compact ? "gap-3 md:items-start" : "gap-4 md:items-end",
        className,
      )}
    >
      <div className={cn(compact ? "space-y-1.5" : "space-y-2")}>
        {eyebrow ? (
          <p
            className={cn(
              "font-semibold uppercase text-[color:var(--muted-foreground)]",
              compact ? "text-[10px] tracking-[0.16em]" : "text-[11px] tracking-[0.18em]",
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <div className={cn(compact ? "space-y-0.5" : "space-y-1")}>
          <h2
            className={cn(
              "font-display font-semibold tracking-tight text-[color:var(--foreground)]",
              compact ? "text-lg md:text-xl" : "text-2xl md:text-3xl",
            )}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={cn(
                "max-w-2xl text-[color:var(--muted-foreground)]",
                compact ? "text-xs leading-5 md:text-sm" : "text-sm leading-6 md:text-[15px]",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
