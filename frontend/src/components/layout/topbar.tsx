"use client";

import Link from "next/link";
import { Bot, MoonStar, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { UserButton } from "@/components/layout/user-button";
import { appRoutes } from "@/config/routes";
import { cn } from "@/lib/cn";

function formatCrumb(segment: string) {
  return segment.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

type TopbarProps = {
  aiChatOpen?: boolean;
  onToggleAiChat?: () => void;
};

export function Topbar({ aiChatOpen = false, onToggleAiChat }: TopbarProps) {
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
      <button
        type="button"
        onClick={onToggleAiChat}
        aria-pressed={aiChatOpen}
        aria-label={aiChatOpen ? "Close AI agent chat" : "Open AI agent chat"}
        title="AI Agent"
        className={cn(
          "group flex h-10 items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-xs font-bold transition-all duration-200",
          aiChatOpen
            ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white shadow-[0_14px_28px_rgba(35,55,84,0.24)]"
            : "border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--foreground)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface)]",
        )}
      >
        <span className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
          aiChatOpen ? "bg-white/18 text-white" : "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]",
        )}>
          {aiChatOpen ? <Sparkles className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </span>
        <span className="hidden sm:inline">AI Agent</span>
      </button>
      <UserButton />
    </header>
  );
}
