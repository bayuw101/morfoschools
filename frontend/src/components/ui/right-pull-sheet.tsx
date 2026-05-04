"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type RightPullSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function RightPullSheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
  footer,
  className,
}: RightPullSheetProps) {
  const [mounted, setMounted] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(open);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (open) {
      setShouldRender(true);
      return;
    }

    const timeout = window.setTimeout(() => setShouldRender(false), 260);
    return () => window.clearTimeout(timeout);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[85] overflow-hidden">
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="right-pull-sheet-title"
        data-open={open}
        className={cn(
          "pointer-events-auto absolute bottom-0 right-0 top-0 flex w-[min(720px,calc(100vw-1.25rem))] translate-x-[calc(100%+40px)] transform-gpu flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[color:var(--surface)] shadow-[-22px_0_80px_rgba(5,13,25,0.18)] will-change-transform transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] data-[open=true]:translate-x-0 data-[open=true]:shadow-[-30px_0_110px_rgba(5,13,25,0.22)] md:bottom-3 md:right-3 md:top-3 md:w-[min(720px,calc(100vw-5rem))] md:rounded-[30px]",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="group absolute left-1 top-1/2 z-[3] hidden h-20 w-4 -translate-y-1/2 items-center justify-center rounded-full transition-colors md:flex cursor-pointer"
          aria-label="Pull handle close"
        >
          <span className="h-14 w-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--muted-foreground)_34%,transparent)] shadow-[inset_0_1px_1px_rgba(255,255,255,.8)] transition-all duration-300 group-hover:h-16 group-hover:bg-[color:var(--brand-strong)]" />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_20%_0%,oklch(93.2%_0.032_255.585/.9),transparent_42%),linear-gradient(180deg,rgba(255,255,255,.78),rgba(255,255,255,0))]" />

        <header className="relative z-[1] border-b border-[color:var(--border)] px-5 py-5 md:px-7 md:py-6 md:pl-12">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
                  {eyebrow}
                </p>
              ) : null}
              <h2
                id="right-pull-sheet-title"
                className="mt-1 font-display text-2xl font-bold tracking-tight text-[color:var(--foreground)] md:text-3xl"
              >
                {title}
              </h2>
              {description ? (
                <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--muted-foreground)]">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--muted-foreground)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--foreground)]"
              aria-label="Close sheet"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <div className="relative z-[1] min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-28 md:px-7 md:py-6 md:pb-32 md:pl-8">
          {children}
        </div>

        {footer ? (
          <footer className="relative z-[1] border-t border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_94%,transparent)] px-5 py-4 backdrop-blur-xl md:px-7 md:pl-12">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {footer}
            </div>
          </footer>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
