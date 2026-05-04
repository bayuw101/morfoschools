"use client";

import React from "react";
import { SecureExamShell } from "@/components/exam/secure-exam-shell";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock3,
  Database,
  FileCheck2,
  RefreshCw,
  Send,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { TextareaField } from "@/components/ui/textarea-field";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { createExamApiClient, resolveExamRuntimeIds, type ExamRuntimeIds } from "@/lib/exam-api";
import type { Exam } from "../../exams/data";
import { getExamDetail } from "../../exams/exam-api";
import {
  calculateAnswerProgress,
  formatClock,
  getAutosaveState,
  getTimeWarning,
  updateAnswerState,
  validateSubmitReadiness,
} from "./take-exam-domain";

export default function TakeExamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = React.useState<Exam | null>(null);
  const [runtime, setRuntime] = React.useState<ExamRuntimeIds | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const api = React.useMemo(() => createExamApiClient(), []);

  React.useEffect(() => {
    getExamDetail(params.id)
      .then((item) => {
        setExam(item);
        setRuntime(resolveExamRuntimeIds(item.id));
        setSecondsLeft(Math.max(Number.parseInt(item.duration, 10) || 90, 1) * 60);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "exam_detail_load_failed"));
  }, [params.id]);
  const [gateToken, setGateToken] = React.useState("");
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = React.useState(90 * 60);
  const [isOnline, setIsOnline] = React.useState(true);
  const [syncState, setSyncState] = React.useState<"saved" | "saving" | "queued">("saved");
  const [lastSavedAt, setLastSavedAt] = React.useState("baru saja");
  const [receiptId, setReceiptId] = React.useState("");
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [violationCount, setViolationCount] = React.useState(0);

  const questions = exam?.questions ?? [];
  const currentQuestion = questions[currentIndex] ?? questions[0];
  const answerProgress = calculateAnswerProgress(questions, answers);
  const answeredCount = answerProgress.answered;
  const progress = answerProgress.progress;
  const autosave = getAutosaveState(isOnline, syncState === "saving");
  const timeWarning = getTimeWarning(secondsLeft);
  const submitReadiness = validateSubmitReadiness(questions, answers, secondsLeft, syncState === "queued");

  React.useEffect(() => {
    if (!exam) return;
    setGateToken(window.sessionStorage.getItem(`exam_gate_token_${exam.id}`) ?? "");
  }, [exam]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
      const savedViolations = window.sessionStorage.getItem("exam_violations");
      if (savedViolations) {
        try {
          setViolationCount(JSON.parse(savedViolations).length);
        } catch {
          setViolationCount(0);
        }
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!currentQuestion || !runtime) return;
    setSyncState(isOnline ? "saving" : "queued");
    const timeout = window.setTimeout(() => {
      if (!isOnline) {
        setSyncState("queued");
        return;
      }
      api
        .autosave(runtime, answers, gateToken)
        .then(() => {
          setSyncState("saved");
          setLastSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
        })
        .catch(() => {
          setSyncState("queued");
          toast("Autosave server gagal", "Jawaban tetap tersimpan di client dan akan dicoba lagi.", "warning");
        });
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [answers, currentQuestion, isOnline, api, runtime, gateToken]);

  function toast(title: string, description: string, tone: ToastItem["tone"] = "success") {
    setToasts((current) => [
      ...current,
      { id: crypto.randomUUID(), title, description, tone },
    ]);
  }

  function updateAnswer(questionId: string, value: string) {
    setAnswers((current) => updateAnswerState(current, questionId, value));
  }

  async function submitExam() {
    if (!exam || !runtime) {
      toast("Exam belum siap", loadError ?? "Data exam/session belum tersedia.", "error");
      return;
    }
    setSyncState("saving");
    try {
      const receipt = await api.submit(runtime, answers, gateToken);
      setReceiptId(receipt.receiptId);
      setSyncState("saved");
      const encodedAnswers = btoa(encodeURIComponent(JSON.stringify(answers)));
      router.push(`/app/exam-result/${exam.id}?receipt=${receipt.receiptId}&attempt=${runtime.attemptId}&answers=${encodedAnswers}`);
    } catch {
      setSyncState("queued");
      toast("Submit server gagal", "Jawaban belum mendapat receipt server. Coba lagi saat koneksi stabil.", "error");
    }
  }

  if (!exam) {
    return (
      <SecureExamShell title="Memuat exam" subtitle="Mengambil data ujian dari backend." mode="exam" allowUnsecure>
        <Panel className="p-6 text-sm text-[color:var(--muted-foreground)]">
          {loadError ? `Gagal memuat exam: ${loadError}` : "Memuat detail exam..."}
        </Panel>
      </SecureExamShell>
    );
  }

  return (
    <SecureExamShell title={exam.title} subtitle="Secure exam aktif. Fullscreen wajib dan pelanggaran dicatat." mode="exam" allowUnsecure={exam.securityMode === "unsecure_allowed"}>
      <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href={`/app/exam-gate/${exam.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--brand)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Exam Gate
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            ISSUE-012 • Offline-first exam client
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            {exam.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Exam-taking surface dengan timer, autosave lokal, queued sync saat offline,
            dan digital receipt saat submit. Critical path tidak bergantung ke Google/AI/analytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={isOnline ? "success" : "default"}>
            {isOnline ? <Wifi className="mr-1 h-3.5 w-3.5" /> : <WifiOff className="mr-1 h-3.5 w-3.5" />}
            {isOnline ? "Online" : "Offline queue"}
          </Badge>
          <Button variant="secondary" onClick={() => setIsOnline((value) => !value)}>
            {isOnline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            Toggle Network
          </Button>
        </div>
      </div>

      {/* Info Cards - Moved Up */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Secure Mode</p>
          <p className="mt-2 text-lg font-bold text-[color:var(--foreground)]">{exam.securityMode === "unsecure_allowed" ? "Optional" : "Required"}</p>
        </div>
        <div className={`rounded-[24px] border p-5 ${violationCount ? "border-red-200 bg-red-50" : "border-[color:var(--border)] bg-[color:var(--surface-subtle)]"}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${violationCount ? "text-red-700" : "text-[color:var(--muted-foreground)]"}`}>Violation Counter</p>
          <p className={`mt-2 text-2xl font-bold ${violationCount ? "text-red-700" : "text-[color:var(--foreground)]"}`}>{violationCount}</p>
        </div>
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Policy</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[color:var(--foreground)]">Esc / tab switch / app switch dicatat otomatis.</p>
        </div>
      </div>
      
      {/* Full Width Question Map */}
      <Panel className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Navigasi Soal</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-[color:var(--brand)]">{answeredCount} Terjawab</span>
            <span className="text-sm font-semibold text-[color:var(--muted-foreground)]">{progress}% Selesai</span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {exam.questions.map((question, index) => {
            const isCurrent = index === currentIndex;
            const answered = Boolean(answers[question.id]);
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`flex h-11 min-w-[2.75rem] shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                  isCurrent
                    ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                    : answered
                      ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                      : "border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--muted-foreground)]"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </Panel>

      {timeWarning.tone === "warning" || timeWarning.tone === "danger" ? (
        <Alert
          tone="warning"
          title="Waktu hampir habis"
          description="Pastikan semua jawaban sudah tersimpan. Submit final tetap akan mengembalikan digital receipt."
        />
        ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel className="overflow-hidden p-0 flex-1">
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge variant="default">Question {currentIndex + 1} of {exam.questions.length}</Badge>
                <h2 className="mt-3 text-lg font-semibold leading-7">{currentQuestion.prompt}</h2>
              </div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">{currentQuestion.points} pts</p>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {currentQuestion.type === "multiple_choice" && currentQuestion.options?.length ? (
              <div className="grid gap-3">
                {currentQuestion.options.map((option) => {
                  const selectedValues = (answers[currentQuestion.id] ?? "").split(",").filter(Boolean);
                  const selected = selectedValues.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? selectedValues.filter((item) => item !== option.id)
                          : [...selectedValues, option.id];
                        updateAnswer(currentQuestion.id, next.join(","));
                      }}
                      className={`flex items-center gap-3 rounded-[22px] border p-4 text-left transition ${
                        selected
                          ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]"
                          : "border-[color:var(--border)] bg-[color:var(--surface-subtle)] hover:border-[color:var(--brand)]"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl font-semibold ${selected ? "bg-[color:var(--brand)] text-white" : "bg-[color:var(--surface)] text-[color:var(--muted-foreground)]"}`}>
                        {selected ? <Check className="h-4 w-4" /> : option.id}
                      </span>
                      <span className="text-sm leading-6">{option.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <TextareaField
                label={currentQuestion.type === "essay" ? "Jawaban essay" : "Jawaban singkat"}
                rows={8}
                value={answers[currentQuestion.id] ?? ""}
                onChange={(event) => updateAnswer(currentQuestion.id, event.target.value)}
              />
            )}

            <div className="flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 sm:flex-row sm:justify-between">
              <Button
                variant="secondary"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
              >
                Previous
              </Button>
              {currentIndex < exam.questions.length - 1 ? (
                <Button onClick={() => setCurrentIndex((index) => Math.min(index + 1, exam.questions.length - 1))}>
                  Next Question
                </Button>
              ) : (
                <Button onClick={submitExam} disabled={!submitReadiness.ready}>
                  <Send className="h-4 w-4" /> Submit Exam
                </Button>
              )}
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="p-5">
            <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4 text-center">
              <Clock3 className="mx-auto mb-3 h-7 w-7 text-[color:var(--brand)]" />
              <p className="font-display text-4xl font-bold tracking-tight">{formatClock(secondsLeft)}</p>
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">Remaining time</p>
            </div>
          </Panel>
          
          <Panel className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[color:var(--brand-soft)] p-3 text-[color:var(--brand)]">
                {syncState === "saving" ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-semibold">Local autosave • {autosave.label}</p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  {syncState === "saving"
                    ? "Menyimpan draft jawaban ke local store..."
                    : syncState === "queued"
                      ? "Offline: perubahan tersimpan lokal dan masuk queue sync."
                      : `Saved locally • ${lastSavedAt}`}
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[color:var(--brand)]" />
              <p className="font-semibold">Reliability guardrails</p>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
              <p>• Autosave lokal + Jittered background sync</p>
              <p>• Submit final to append-only inbox</p>
              <p>• Receipt ID sebagai bukti</p>
            </div>
          </Panel>

          {receiptId ? (
            <Panel className="border-[color:var(--brand)] p-5">
              <div className="flex items-start gap-3">
                <FileCheck2 className="mt-1 h-5 w-5 text-[color:var(--success)]" />
                <div>
                  <p className="font-semibold">Digital Receipt</p>
                  <p className="mt-2 break-all rounded-2xl bg-[color:var(--surface-subtle)] p-3 text-sm font-semibold text-[color:var(--foreground)]">
                    {receiptId}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[color:var(--muted-foreground)]">
                    Simpan receipt ini sebagai bukti bahwa jawaban sudah diterima oleh sistem.
                  </p>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel className="p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
                <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Jangan tutup halaman sebelum receipt muncul. Jika koneksi putus, jawaban tetap queued secara lokal.
                </p>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <div className="fixed bottom-5 right-5 z-[95] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((item) => (
          <Toast
            key={item.id}
            toast={item}
            onDismiss={(id) =>
              setToasts((current) => current.filter((toastItem) => toastItem.id !== id))
            }
          />
        ))}
      </div>
      </div>
    </SecureExamShell>
  );
}
