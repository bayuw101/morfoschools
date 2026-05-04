import type { LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/panel";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <Panel className="h-full p-5">
      <div className="flex h-full items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
            {label}
          </p>
          <div className="space-y-1.5">
            <p className="font-display text-[2rem] font-semibold leading-none tracking-tight text-[color:var(--foreground)]">
              {value}
            </p>
            <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
              {detail}
            </p>
          </div>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Panel>
  );
}
