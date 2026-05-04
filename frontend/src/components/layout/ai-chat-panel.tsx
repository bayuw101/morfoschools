"use client";

import * as React from "react";
import { AlertCircle, Bot, CheckCircle2, GraduationCap, Loader2, Paperclip, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Buatkan ringkasan progres kelas 10-A",
  "Cari siswa yang perlu remedial",
  "Draft pengumuman ujian besok",
];

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Halo, saya MORFOSCHOOLS AI Agent. Saya siap membantu operasional sekolah: analisis kelas, persiapan exam, grading, dan drafting komunikasi.",
  },
];

export function AiChatPanel() {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = (await response.json().catch(() => null)) as { message?: ChatMessage; error?: string } | null;
      if (!response.ok || !data?.message?.content) {
        throw new Error(data?.error ?? "AI agent belum bisa merespons.");
      }

      setMessages((current) => [...current, { role: "assistant", content: data.message!.content }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Gagal menghubungi MORFOSCHOOLS AI.");
      setMessages((current) => current.filter((message, index) => index !== current.length - 1 || message.role !== "user"));
      setInput(trimmed);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border border-white/10 bg-[color:var(--shell)] text-white shadow-[0_28px_70px_rgba(0,0,0,0.38)] md:rounded-[30px]">
      <div className="shrink-0 border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#f5f7fb] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.24)]">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-[#f5f7fb]">MORFOSCHOOLS AI</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#cfe0ff]">
                <Sparkles className="h-3 w-3" /> Live
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-[#9caeca]">Connected via secure server proxy</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9caeca]">Model</p>
            <p className="mt-1 text-xs font-semibold text-[#f5f7fb]">MORFOSCHOOLS</p>
          </div>
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-emerald-200">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Status</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> 9router Ready
            </p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 [scrollbar-color:rgba(255,255,255,0.22)_transparent]">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#9caeca]">
            <GraduationCap className="h-4 w-4" /> Suggested actions
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={isSending}
                onClick={() => void sendMessage(suggestion)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-xs font-medium leading-5 text-[#f0f4fb] transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
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
              <div key={`${message.role}-${index}-${message.content.slice(0, 12)}`} className={isUser ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-[24px] border px-4 py-3 text-sm leading-6 shadow-[0_14px_30px_rgba(0,0,0,0.22)] ${
                    isUser
                      ? "border-[#486b9c]/70 bg-[#486b9c] text-white"
                      : "border-white/10 bg-white/[0.08] text-[#f5f7fb]"
                  }`}
                >
                  <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.14em] ${isUser ? "text-white/72" : "text-[#9caeca]"}`}>
                    {isUser ? "You" : "MORFOSCHOOLS AI"}
                  </p>
                  <p>{message.content}</p>
                </div>
              </div>
            );
          })}
          {isSending ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-[24px] border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-medium text-[#cbd7ec] shadow-[0_14px_30px_rgba(0,0,0,0.22)]">
                <Loader2 className="h-4 w-4 animate-spin" /> MORFOSCHOOLS sedang berpikir...
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/10 bg-[color:var(--shell-elevated)] p-4">
        {error ? (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        <div className="rounded-[24px] border border-white/10 bg-black/10 p-2 shadow-[0_18px_38px_rgba(0,0,0,0.24)]">
          <textarea
            rows={3}
            value={input}
            disabled={isSending}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder="Ask AI agent about exams, students, courses..."
            className="min-h-[76px] w-full resize-none rounded-[18px] bg-transparent px-3 py-2 text-sm leading-6 text-[#f5f7fb] outline-none placeholder:text-[#9caeca] disabled:cursor-not-allowed disabled:opacity-70"
          />
          <div className="flex items-center justify-between gap-2 border-t border-white/10 px-1 pt-2">
            <Button type="button" variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/10 text-[#f5f7fb] hover:bg-white/15" disabled>
              <Paperclip className="h-4 w-4" /> Context
            </Button>
            <Button type="submit" size="sm" className="rounded-2xl bg-white text-[color:var(--shell)] hover:bg-[#eef3fb]" disabled={isSending || !input.trim()}>
              {isSending ? "Sending" : "Send"} {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </form>
    </aside>
  );
}
