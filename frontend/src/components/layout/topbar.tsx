"use client";

import Link from "next/link";
import { MoonStar } from "lucide-react";
import { usePathname } from "next/navigation";
import { UserButton } from "@/components/layout/user-button";
import { appRoutes } from "@/config/routes";
import { cn } from "@/lib/cn";

function formatCrumb(segment: string) {
  return segment.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function Topbar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const appSegments = segments[0] === "app" ? segments.slice(1) : segments;

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
          <Link href={appRoutes.appHome} className="transition-colors hover:text-[color:var(--foreground)]">Morfosis</Link>
          {appSegments.map((segment, index) => (
            <span key={`${segment}-${index}`} className="inline-flex items-center gap-2">
              <span>/</span>
              <span className={cn(index === appSegments.length - 1 ? "font-semibold text-[color:var(--foreground)]" : "transition-colors hover:text-[color:var(--foreground)]")}>{formatCrumb(segment)}</span>
            </span>
          ))}
        </div>
      </div>

      <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--muted-foreground)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--foreground)]" aria-label="Theme preview" title="Theme preview">
        <MoonStar className="h-4 w-4" />
      </button>
      <UserButton />
    </header>
  );
}
