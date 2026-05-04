import { AlertCircle, CircleCheckBig, Info, TriangleAlert } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva("rounded-[20px] border px-3.5 py-3.5 md:px-4 md:py-4", {
  variants: {
    tone: {
      info: "border-[color:var(--border)] bg-[color:var(--surface-subtle)]",
      success: "border-[color:var(--success)] bg-[color:var(--success-soft)]",
      warning: "border-[color:var(--warning)] bg-[color:var(--warning-soft)]",
      error: "border-[color:var(--danger)] bg-[color:var(--danger-soft)]",
    },
  },
  defaultVariants: {
    tone: "info",
  },
});

const alertIcons = {
  info: Info,
  success: CircleCheckBig,
  warning: TriangleAlert,
  error: AlertCircle,
} as const;

type AlertProps = VariantProps<typeof alertVariants> & {
  title: string;
  description: string;
  className?: string;
  action?: React.ReactNode;
};

export function Alert({ title, description, tone = "info", className, action }: AlertProps) {
  const resolvedTone = tone ?? "info";
  const Icon = alertIcons[resolvedTone];

  return (
    <div className={cn(alertVariants({ tone: resolvedTone }), className)}>
      <div className="flex items-start gap-2.5 md:gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface)] text-[color:var(--brand-strong)] md:h-9 md:w-9">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)] md:text-sm md:leading-6">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
