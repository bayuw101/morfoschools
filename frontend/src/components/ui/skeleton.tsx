import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[color:var(--surface-subtle)]/80",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite]",
        "before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]",
        className,
      )}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="mt-4 h-8 w-16 rounded-xl" />
      <Skeleton className="mt-3 h-3 w-32 rounded-full" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <div className="grid gap-4 px-5 py-4 md:grid-cols-[1.5fr_1fr_1fr_auto]">
      <div>
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="mt-3 h-3 w-56 rounded-full" />
      </div>
      {Array.from({ length: Math.max(0, columns - 1) }).map((_, index) => (
        <div key={index} className="hidden md:block">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="mt-3 h-3 w-20 rounded-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 4, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <div aria-label="Memuat data" className="divide-y divide-[color:var(--border)]">
      {Array.from({ length: rows }).map((_, index) => (
        <TableRowSkeleton key={index} columns={columns} />
      ))}
    </div>
  );
}
