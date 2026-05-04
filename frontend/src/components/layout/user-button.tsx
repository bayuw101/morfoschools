"use client";

import * as React from "react";
import { ChevronDown, KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

function getInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length === 0 ? "MF" : parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function UserButton() {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const resolvedName = "Guru Morfosis";
  const resolvedHandle = "guru.morfosis";
  const resolvedEmail = "guru@morfosis.local";
  const initials = getInitials(resolvedName);

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className={cn("group flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-subtle)] py-1 pl-1.5 pr-3 transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface)]", open && "border-[color:var(--border-strong)] bg-[color:var(--surface)]")}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#486b9c_0%,#233754_100%)] text-xs font-bold text-white">{initials}</div>
        <div className="hidden text-left sm:block">
          <p className="text-xs font-semibold text-[color:var(--foreground)]">{resolvedName}</p>
          <p className="text-[11px] text-[color:var(--muted-foreground)]">@{resolvedHandle}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-[color:var(--muted-foreground)] transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-2 shadow-[0_28px_54px_rgba(9,17,28,0.24)]">
          <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-4 py-3">
            <p className="text-sm font-semibold text-[color:var(--foreground)]">{resolvedName}</p>
            <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">{resolvedEmail}</p>
            <p className="mt-2 inline-flex rounded-full bg-[color:var(--brand-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--brand-strong)]">Administrator Sekolah</p>
          </div>

          <div className="mt-2 space-y-1">
            {[
              { icon: UserRound, title: "Profile", desc: "@" + resolvedHandle },
              { icon: ShieldCheck, title: "Session status", desc: "Mock session aktif untuk review UI." },
              { icon: KeyRound, title: "Tenant", desc: "SMP Morfosis Demo" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-[18px] px-3 py-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"><item.icon className="h-4 w-4" /></div>
                <div><p className="text-sm font-semibold text-[color:var(--foreground)]">{item.title}</p><p className="mt-0.5 text-xs leading-5 text-[color:var(--muted-foreground)]">{item.desc}</p></div>
              </div>
            ))}
          </div>

          <div className="mt-2 border-t border-[color:var(--border)] pt-2">
            <button type="button" className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger-soft)]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--danger-soft)]"><LogOut className="h-4 w-4" /></div>
              <div><p className="text-sm font-semibold">Sign out</p><p className="mt-0.5 text-xs leading-5 text-[color:var(--muted-foreground)]">Kembali ke halaman login.</p></div>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
