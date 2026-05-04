"use client";

import React from "react";
import { SecureExamShell } from "@/components/exam/secure-exam-shell";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DoorOpen,
  FileText,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { initialExams } from "../../exams/data";
import {
  formatGateDateTime,
  getGateEligibilityState,
  validateGateAccess,
  validateScheduleWindow,
} from "./exam-gate-domain";

export default function ExamGatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const exam = initialExams.find((item) => item.id === params.id) ?? initialExams[0];
  const gate = exam.gateRules[0];
  const [password, setPassword] = React.useState("");
  const [acceptedRules, setAcceptedRules] = React.useState(false);
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const requiresPassword = Boolean(gate?.passwordEnabled);
  const passwordValid = !requiresPassword || password.trim() === gate?.password;
  const eligibility = getGateEligibilityState({ inTarget: true, missingCourses: [], missingExams: [] });
  const schedule = validateScheduleWindow(gate, new Date("2026-05-06T08:30:00"));
  const gateAccess = validateGateAccess({ gate, password, acceptedRules, eligibility, schedule });
  const isEligible = eligibility.eligible;
  const canEnter = gateAccess.canEnter;

  function toast(title: string, description: string, tone: ToastItem["tone"] = "success") {
    setToasts((current) => [
      ...current,
      { id: crypto.randomUUID(), title, description, tone },
    ]);
  }

  function enterExam() {
    if (!acceptedRules) {
      toast("Rules belum disetujui", "Centang persetujuan rules sebelum masuk exam.", "warning");
      return;
    }
    if (!passwordValid) {
      toast("Password salah", "Minta password gate ke guru/pengawas ujian.", "error");
      return;
    }
    router.push(`/app/take-exam/${exam.id}`);
  }

  return (
    <SecureExamShell title={exam.title} subtitle="Secure gate aktif. Baca rules dan validasi akses sebelum ujian." mode="gate" allowUnsecure={exam.securityMode === "unsecure_allowed"}>
      <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/app/exams"
            className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--brand)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Exams
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            Exam Gate
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            {exam.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Gate memastikan siswa membaca rules, memenuhi eligibility, berada dalam jadwal open,
            dan memasukkan password bila guru mengaktifkan proteksi.
          </p>
        </div>
        <Badge variant={isEligible ? "success" : "default"}>
          {isEligible ? "Eligible" : "Blocked"}
        </Badge>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <MetricCard label="Duration" value={exam.duration} detail="Timer mulai setelah masuk" icon={Clock3} />
        <MetricCard label="Questions" value={String(exam.questions.length)} detail="Soal tersedia" icon={FileText} />
        <MetricCard label="Targets" value={String(gate?.targets.length ?? 0)} detail={gate?.scope ?? "class"} icon={Users} />
        <MetricCard label="Protection" value={requiresPassword ? "Password" : "Open"} detail="Gate rule aktif" icon={ShieldCheck} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel className="p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-2xl bg-[color:var(--brand-soft)] p-3 text-[color:var(--brand)]">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-lg">Schedule & Access Window</p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Jika jadwal belum open, tombol masuk exam harus disabled di backend meskipun UI bisa dibuka.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Published</p>
                <p className="mt-2 text-sm font-semibold">{formatGateDateTime(gate?.publishAt)}</p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Open</p>
                <p className="mt-2 text-sm font-semibold">{formatGateDateTime(gate?.openAt)}</p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Close</p>
                <p className="mt-2 text-sm font-semibold">{formatGateDateTime(gate?.closeAt)}</p>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-2xl bg-[color:var(--surface-subtle)] p-3 text-[color:var(--brand)]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-lg">Exam Rules</p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Baca aturan sebelum masuk. Setelah masuk, timer akan berjalan dan autosave aktif.
                </p>
              </div>
            </div>
            <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4 text-sm leading-7 text-[color:var(--foreground)]">
              {exam.rules}
            </div>
            <button
              type="button"
              onClick={() => setAcceptedRules((value) => !value)}
              className={`mt-4 flex w-full items-center gap-3 rounded-[22px] border p-4 text-left transition ${
                acceptedRules
                  ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--brand)]"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl ${acceptedRules ? "bg-[color:var(--brand)] text-white" : "bg-[color:var(--surface-subtle)] text-[color:var(--muted-foreground)]"}`}>
                {acceptedRules ? <CheckCircle2 className="h-4 w-4" /> : null}
              </span>
              <span className="text-sm font-medium">Saya sudah membaca dan memahami rules exam.</span>
            </button>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-2xl bg-[color:var(--brand-soft)] p-3 text-[color:var(--brand)]">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-lg">Gate Check</p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Validasi ringan di UI, validasi final tetap wajib di server sebelum token exam dibuat.
                </p>
              </div>
            </div>

            {requiresPassword ? (
              <FloatingInput
                label="Exam password"
                prefix={<KeyRound className="h-4 w-4" />}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={password && !passwordValid ? "Password belum sesuai" : undefined}
                helperText="Masukkan password dari guru/pengawas."
              />
            ) : (
              <Alert tone="info" title="Tidak perlu password" description="Gate exam ini dibuka tanpa password tambahan." />
            )}

            <div className="mt-4 space-y-2 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4 text-sm leading-6 text-[color:var(--muted-foreground)]">
              <p>• Eligibility: {isEligible ? "terpenuhi" : "blocked"}</p>
              <p>• Rules: {acceptedRules ? "disetujui" : "belum disetujui"}</p>
              <p>• Password: {requiresPassword ? (passwordValid ? "valid" : "dibutuhkan") : "tidak diperlukan"}</p>
            </div>

            <Button className="mt-5 w-full" onClick={enterExam} disabled={!canEnter}>
              <DoorOpen className="h-4 w-4" /> Enter Exam
            </Button>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-[color:var(--brand)]" />
              <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                Setelah gate lolos, server sebaiknya membuat short-lived exam session token.
                Token ini dipakai halaman take exam untuk autosave dan submit receipt.
              </p>
            </div>
          </Panel>
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
