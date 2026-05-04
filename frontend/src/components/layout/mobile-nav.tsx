"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { primaryNavigation } from "@/config/navigation";
import { cn } from "@/lib/cn";

export function MobileNav() {
  const pathname = usePathname();
  const [pendingRoute, setPendingRoute] = React.useState<string | null>(null);

  React.useEffect(() => setPendingRoute(null), [pathname]);

  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-2 py-2 shadow-[0_18px_40px_rgba(17,32,51,0.18)] backdrop-blur-xl md:hidden">
      {primaryNavigation.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
        const isPending = pendingRoute === item.href;
        return (
          <Link key={item.href} href={item.href} onClick={() => !isActive && setPendingRoute(item.href)} className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-semibold transition-colors", isActive ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]" : "text-[color:var(--muted-foreground)]")}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
