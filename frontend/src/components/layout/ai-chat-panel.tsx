"use client";

import { Bot, CheckCircle2, GraduationCap, Paperclip, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const suggestions = [
  "Buatkan ringkasan progres kelas 10-A",
  "Cari siswa yang perlu remedial",
  "Draft pengumuman ujian besok",
];

const messages = [
  {
    role: "assistant",
    title: "Morfosis AI Agent",
    body: "Halo, saya siap membantu operasional sekolah: analisis kelas, persiapan exam, dan drafting komunikasi. UI ini sementara belum terhubung ke agent runtime.",
  },
  {
    role: "user",
    title: "Teacher",
    body: "Tolong cek readiness UTS Matematika X.",
  },
  {
    role: "assistant",
    title: "Morfosis AI Agent",
    body: "Siap. Nanti agent akan membaca konteks tenant, role, course, exam, dan audit trail tanpa menyentuh critical path ujian.",
  },
];

export function AiChatPanel() {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(246,248,252,0.94)_100%)] shadow-[0_28px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl md:rounded-[30px]">
      <div className="border-b border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_88%,transparent)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#486b9c_0%,#233754_100%)] text-white shadow-[0_14px_28px_rgba(35,55,84,0.28)]">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-[color:var(--foreground)]">Morfosis AI</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-strong)]">
                <Sparkles className="h-3 w-3" /> Preview
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-[color:var(--muted-foreground)]">School ops agent workspace</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Mode</p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--foreground)]">Teacher Assist</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Status</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold"><CheckCircle2 className="h-3.5 w-3.5" /> UI Ready</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-[0_18px_38px_rgba(9,17,28,0.08)]">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
            <GraduationCap className="h-4 w-4" /> Suggested actions
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3 py-2.5 text-left text-xs font-medium leading-5 text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-soft)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div key={`${message.role}-${index}`} className={isUser ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[88%] rounded-[24px] border px-4 py-3 text-sm leading-6 shadow-[0_14px_30px_rgba(9,17,28,0.08)] ${isUser ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white" : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)]"}`}>
                  <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.14em] ${isUser ? "text-white/72" : "text-[color:var(--muted-foreground)]"}`}>{message.title}</p>
                  <p>{message.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_90%,transparent)] p-4">
        <div className="rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-2 shadow-[0_18px_38px_rgba(9,17,28,0.1)]">
          <textarea
            rows={3}
            placeholder="Ask AI agent about exams, students, courses..."
            className="min-h-[76px] w-full resize-none rounded-[18px] bg-transparent px-3 py-2 text-sm leading-6 text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-foreground)]"
          />
          <div className="flex items-center justify-between gap-2 border-t border-[color:var(--border)] px-1 pt-2">
            <Button type="button" variant="secondary" size="sm" className="rounded-2xl">
              <Paperclip className="h-4 w-4" /> Context
            </Button>
            <Button type="button" size="sm" className="rounded-2xl">
              Send <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
