"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { cn } from "@/lib/cn";

type AppShellProps = { children: ReactNode };

export function AppShell({ children }: AppShellProps) {
  const isCanvasRoute = false;
  return (
    <div className="h-screen overflow-hidden bg-[color:var(--shell)]">
      <Sidebar />
      <div className="h-screen md:pl-[66px]">
        <div className="h-full p-0 md:p-3 md:pl-2">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-none bg-[color:var(--background)] md:rounded-[30px] md:border md:border-[color:var(--border)] md:shadow-[0_28px_64px_rgba(6,15,29,0.14)]">
            <Topbar />
            <main className={cn("main-container min-h-0 flex-1", isCanvasRoute ? "overflow-hidden" : "overflow-y-auto")}>
              <div className={cn(isCanvasRoute ? "h-full" : "space-y-10 px-4 py-6 pb-28 md:px-6 md:pb-8 lg:px-8")}>{children}</div>
            </main>
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
