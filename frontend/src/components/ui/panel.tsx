import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const panelVariants = cva(
  "rounded-[24px] border shadow-[0_24px_48px_rgba(18,34,57,0.08)]",
  {
    variants: {
      tone: {
        default:
          "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)]",
        shell:
          "border-white/10 bg-[color:var(--shell-elevated)] text-white shadow-[0_24px_50px_rgba(5,10,23,0.35)]",
        muted:
          "border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--foreground)] shadow-none",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

type PanelProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & VariantProps<typeof panelVariants> &
  Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Panel<T extends ElementType = "section">({
  as,
  children,
  className,
  tone,
  ...props
}: PanelProps<T>) {
  const Component = as ?? "section";

  return (
    <Component className={cn(panelVariants({ tone }), className)} {...props}>
      {children}
    </Component>
  );
}
