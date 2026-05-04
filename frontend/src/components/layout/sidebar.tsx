"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { appRoutes } from "@/config/routes";
import { primaryNavigation } from "@/config/navigation";
import { cn } from "@/lib/cn";
import { LogoLockup } from "@/components/ui/logo-lockup";

export function Sidebar() {
  const pathname = usePathname();
  const [pendingRoute, setPendingRoute] = React.useState<string | null>(null);

  React.useEffect(() => setPendingRoute(null), [pathname]);

  return (
    <aside className="ml-1 fixed inset-y-0 left-0 z-40 hidden w-[66px] flex-col items-center bg-[color:var(--shell)] px-3 py-4 md:flex">
      <Link
        href={appRoutes.appHome}
        className="mb-3 mt-3"
        aria-label="Morfosis home"
      >
        <LogoLockup compact />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {primaryNavigation.map((item) => {
          const isActive =
            item.href === appRoutes.appHome
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const isPending = pendingRoute === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => !isActive && setPendingRoute(item.href)}
              className={cn(
                "group relative flex h-[42px] w-[42px] items-center justify-center rounded-[11px] transition-colors duration-200",
                isActive
                  ? "bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "hover:bg-white/6",
              )}
              aria-label={item.label}
              title={item.label}
            >
              <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[9px] transition-colors duration-200">
                {isPending ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin text-[#f5f7fb]" />
                ) : (
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                      isActive
                        ? "text-[#f5f7fb] stroke-[2.25]"
                        : "text-[#9caeca] group-hover:text-[#f0f4fb] stroke-[2.15]",
                    )}
                  />
                )}
              </span>
              <span className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--shell-elevated)] px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-[0_12px_24px_rgba(5,10,20,0.3)] transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
