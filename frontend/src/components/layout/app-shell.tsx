"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AiChatPanel } from "@/components/layout/ai-chat-panel";
import { cn } from "@/lib/cn";

type AppShellProps = { children: ReactNode };

export function AppShell({ children }: AppShellProps) {
  const isCanvasRoute = false;
  const [aiChatOpen, setAiChatOpen] = React.useState(false);
  return (
    <div className="h-screen overflow-hidden bg-[color:var(--shell)]">
      <Sidebar />
      <div className="h-screen md:pl-[66px]">
        <div
          className={cn(
            "grid h-full min-h-0 gap-3 p-0 transition-[grid-template-columns] duration-300 ease-out md:p-3 md:pl-2",
            aiChatOpen ? "md:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_430px]" : "md:grid-cols-[minmax(0,1fr)_0px]",
          )}
        >
          <div className="h-full min-h-0 min-w-0 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-none bg-[color:var(--background)] transition-all duration-300 ease-out md:rounded-[30px] md:border md:border-[color:var(--border)] md:shadow-[0_28px_64px_rgba(6,15,29,0.14)]">
              <Topbar aiChatOpen={aiChatOpen} onToggleAiChat={() => setAiChatOpen((value) => !value)} />
              <main className={cn("main-container min-h-0 flex-1", isCanvasRoute ? "overflow-hidden" : "overflow-y-auto")}>
                <div className={cn(isCanvasRoute ? "h-full" : "space-y-10 px-4 py-6 pb-28 md:px-6 md:pb-8 lg:px-8")}>{children}</div>
              </main>
            </div>
          </div>
          <div
            className={cn(
              "hidden h-full min-h-0 min-w-0 overflow-hidden transition-[opacity,transform] duration-300 ease-out md:block",
              aiChatOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0",
            )}
            aria-hidden={!aiChatOpen}
          >
            <AiChatPanel />
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
