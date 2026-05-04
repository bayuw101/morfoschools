import { cn } from "@/lib/cn";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[color:var(--border-strong)]/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.2s_infinite]",
        "before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.86),transparent)]",
        "after:absolute after:inset-0 after:bg-[linear-gradient(180deg,rgba(255,255,255,0.20),transparent)]",
        className,
      )}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div
      aria-label="Memuat ringkasan metrik"
      className="h-full rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
    >
      <div className="flex h-full min-h-[104px] items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
          <Skeleton className="h-[13px] w-32 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-6 w-44 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
      </div>
    </div>
  );
}

type DirectoryRowSkeletonProps = {
  className: string;
  kind: "tenants" | "users" | "classes" | "groups";
};

function TextPairSkeleton({ titleWidth = "w-44", subtitleWidth = "w-56" }: { titleWidth?: string; subtitleWidth?: string }) {
  return (
    <div className="min-w-0">
      <Skeleton className={cn("h-5 rounded-full", titleWidth)} />
      <Skeleton className={cn("mt-1 h-4 rounded-full", subtitleWidth)} />
    </div>
  );
}

function ButtonClusterSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={cn("h-9 rounded-full", index === 0 ? "w-[82px]" : index === 1 ? "w-[92px]" : "w-[96px]")} />
      ))}
    </div>
  );
}

export function DirectoryRowSkeleton({ className, kind }: DirectoryRowSkeletonProps) {
  if (kind === "tenants") {
    return (
      <div className={cn("grid gap-4 px-5 py-4 md:items-center", className)}>
        <TextPairSkeleton titleWidth="w-48" subtitleWidth="w-60" />
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <ButtonClusterSkeleton count={2} />
      </div>
    );
  }

  if (kind === "users") {
    return (
      <div className={cn("grid gap-4 px-5 py-4 md:items-center", className)}>
        <TextPairSkeleton titleWidth="w-44" subtitleWidth="w-56" />
        <Skeleton className="h-5 w-40 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-9 w-[82px] rounded-full" />
        <Skeleton className="h-9 w-[106px] rounded-full" />
      </div>
    );
  }

  if (kind === "classes") {
    return (
      <div className={cn("grid gap-4 px-5 py-4 md:items-center", className)}>
        <TextPairSkeleton titleWidth="w-28" subtitleWidth="w-44" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-5 w-40 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <ButtonClusterSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 px-5 py-4 md:items-center", className)}>
      <TextPairSkeleton titleWidth="w-48" subtitleWidth="w-24" />
      <Skeleton className="h-5 w-32 rounded-full" />
      <Skeleton className="h-5 w-36 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <ButtonClusterSkeleton count={3} />
    </div>
  );
}

export function DirectoryTableSkeleton({
  rows = 4,
  kind,
  className,
}: {
  rows?: number;
  kind: DirectoryRowSkeletonProps["kind"];
  className: string;
}) {
  return (
    <div aria-label="Memuat data" className="divide-y divide-[color:var(--border)]">
      {Array.from({ length: rows }).map((_, index) => (
        <DirectoryRowSkeleton key={index} kind={kind} className={className} />
      ))}
    </div>
  );
}

export function TableRowSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <div className="grid gap-4 px-5 py-4 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center">
      <TextPairSkeleton />
      {Array.from({ length: Math.max(0, columns - 1) }).map((_, index) => (
        <div key={index} className="hidden md:block">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="mt-1 h-4 w-20 rounded-full" />
        </div>
      ))}
      <ButtonClusterSkeleton count={2} />
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
