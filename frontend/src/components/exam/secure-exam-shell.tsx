"use client";

import React from "react";
import { Maximize2, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ExamViolation = {
  id: string;
  type: "fullscreen_exit" | "tab_hidden" | "window_blur";
  message: string;
  at: string;
};

export function SecureExamShell({
  children,
  title,
  subtitle,
  mode = "gate",
  receipt = false,
  allowUnsecure = false,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  mode?: "gate" | "exam" | "receipt";
  receipt?: boolean;
  allowUnsecure?: boolean;
}) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [violations, setViolations] = React.useState<ExamViolation[]>([]);
  const reenterTimerRef = React.useRef<number | null>(null);

  const pushViolation = React.useCallback((type: ExamViolation["type"], message: string) => {
    const violation: ExamViolation = {
      id: crypto.randomUUID(),
      type,
      message,
      at: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    setViolations((current) => {
      const next = [violation, ...current].slice(0, 6);
      window.sessionStorage.setItem("exam_violations", JSON.stringify(next));
      return next;
    });
  }, []);

  React.useEffect(() => {
    const saved = window.sessionStorage.getItem("exam_violations");
    if (saved) {
      try {
        setViolations(JSON.parse(saved) as ExamViolation[]);
      } catch {
        setViolations([]);
      }
    }
  }, []);

  React.useEffect(() => {
    function syncFullscreen() {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active && mode !== "receipt") {
        pushViolation("fullscreen_exit", "User keluar dari fullscreen exam mode.");
        if (!allowUnsecure) {
          if (reenterTimerRef.current) window.clearTimeout(reenterTimerRef.current);
          reenterTimerRef.current = window.setTimeout(() => {
            void requestFullscreen(false);
          }, 650);
        }
      }
    }

    function handleVisibility() {
      if (document.hidden && mode !== "receipt") {
        pushViolation("tab_hidden", "User berpindah tab atau menyembunyikan halaman exam.");
      }
    }

    function handleBlur() {
      if (mode !== "receipt") {
        pushViolation("window_blur", "Window exam kehilangan fokus / user berpindah aplikasi.");
      }
    }

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    setIsFullscreen(Boolean(document.fullscreenElement));
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [allowUnsecure, mode, pushViolation]);

  async function requestFullscreen(logFailure = true) {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch {
      if (logFailure) {
        pushViolation("fullscreen_exit", "Browser menolak request fullscreen. User harus mengizinkan fullscreen.");
      }
    }
  }

  async function exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore browser fullscreen exit errors; navigation should continue.
    }
  }

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      void requestFullscreen(false);
    }, 250);
    return () => window.clearTimeout(timeout);
    // Intentionally run once on mount to force fullscreen where browser policy allows it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (anchor) {
        void exitFullscreen();
      }
    }

    function handlePopState() {
      void exitFullscreen();
    }

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const isLocked = mode !== "receipt" && !isFullscreen;

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-[radial-gradient(circle_at_top_left,oklch(88%_0.07_255_/_0.75),transparent_28%),radial-gradient(circle_at_bottom_right,oklch(82%_0.11_290_/_0.38),transparent_30%),linear-gradient(135deg,oklch(98%_0.006_255),oklch(93%_0.018_260))] px-4 py-6 text-[color:var(--foreground)] sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 opacity-60 [background-image:linear-gradient(to_right,oklch(70%_0.02_260_/_0.15)_1px,transparent_1px),linear-gradient(to_bottom,oklch(70%_0.02_260_/_0.15)_1px,transparent_1px)] [background-size:54px_54px]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <div className="mb-5 flex animate-[fadeIn_420ms_ease-out] flex-col gap-4 rounded-[30px] border border-white/70 bg-white/70 p-4 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] bg-[color:var(--brand)] text-white shadow-[0_18px_40px_oklch(54.6%_0.245_262.881_/_0.28)]">
              <ShieldCheck className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-[color:var(--success)]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-xl font-bold tracking-tight">{title}</p>
                <Badge variant={isFullscreen || receipt ? "success" : "default"}>
                  {receipt ? "Receipt" : isFullscreen ? "Fullscreen secured" : "Fullscreen required"}
                </Badge>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={violations.length ? "default" : "success"}>
              <ShieldAlert className="mr-1 h-3.5 w-3.5" /> {violations.length} violations
            </Badge>
            {mode !== "receipt" && allowUnsecure ? (
              <Button type="button" variant={isFullscreen ? "secondary" : "primary"} onClick={() => void requestFullscreen(true)}>
                <Maximize2 className="h-4 w-4" /> {isFullscreen ? "Re-enter Fullscreen" : "Start Fullscreen"}
              </Button>
            ) : null}
          </div>
        </div>

        {isLocked && allowUnsecure ? (
          <div className="mb-5 animate-[fadeIn_420ms_ease-out] rounded-[30px] border border-amber-200 bg-amber-50/90 p-5 shadow-[0_18px_60px_rgba(180,83,9,0.12)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-amber-950">Fullscreen wajib untuk melanjutkan</p>
                  <p className="mt-1 text-sm leading-6 text-amber-900/75">
                    Browser tidak bisa benar-benar mencegah pindah tab/aplikasi, tetapi sistem akan mencatatnya sebagai pelanggaran.
                  </p>
                </div>
              </div>
              <Button type="button" onClick={() => void requestFullscreen(true)}>
                <Sparkles className="h-4 w-4" /> Enable Secure Mode
              </Button>
            </div>
          </div>
        ) : null}

        {violations.length ? (
          <div className="mb-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {violations.slice(0, 3).map((violation) => (
              <div key={violation.id} className="animate-[fadeIn_260ms_ease-out] rounded-2xl border border-red-200 bg-red-50/85 p-3 text-xs leading-5 text-red-900 shadow-sm">
                <span className="font-semibold">{violation.at}</span> • {violation.message}
              </div>
            ))}
          </div>
        ) : null}

        <div className="w-full flex-1 animate-[slideUp_460ms_ease-out] rounded-[36px] border border-white/80 bg-white/76 p-4 shadow-[0_30px_120px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:p-6 lg:p-8">
          {isLocked && !allowUnsecure ? (
            <button
              type="button"
              onClick={() => void requestFullscreen(true)}
              className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-8 text-center transition hover:border-[color:var(--brand)]"
            >
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-[28px] bg-[color:var(--brand)] text-white shadow-[0_18px_50px_oklch(54.6%_0.245_262.881_/_0.26)]">
                <ShieldCheck className="h-7 w-7" />
              </span>
              <span className="font-display text-2xl font-bold tracking-tight">Secure fullscreen wajib</span>
              <span className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--muted-foreground)]">
                Sistem sedang mencoba membuka fullscreen otomatis. Jika browser memblokir, klik area ini untuk masuk secure mode.
              </span>
            </button>
          ) : (
            children
          )}
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
