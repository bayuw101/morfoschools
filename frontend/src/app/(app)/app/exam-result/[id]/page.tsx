"use client";

import React from "react";
import { SecureExamShell } from "@/components/exam/secure-exam-shell";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Gauge,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { createExamApiClient, resolveExamRuntimeIds, type ExamResultReadModel } from "@/lib/exam-api";
import { initialExams } from "../../exams/data";
import {
  calculateMultipleChoiceScore,
  decodeAnswers,
  getFeedbackVisibility,
  groupResultSections,
} from "./exam-result-domain";

export default function ExamResultPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const exam = initialExams.find((item) => item.id === params.id) ?? initialExams[0];
  const runtime = React.useMemo(() => resolveExamRuntimeIds(exam.id, { attemptId: searchParams.get("attempt") ?? undefined }), [exam.id, searchParams]);
  const api = React.useMemo(() => createExamApiClient(), []);
  const [serverResult, setServerResult] = React.useState<ExamResultReadModel | null>(null);
  const [resultError, setResultError] = React.useState("");
  const receipt = serverResult?.receipt?.receiptId ?? searchParams.get("receipt") ?? `RCT-${exam.id.toUpperCase()}`;
  const answers = decodeAnswers(searchParams.get("answers"));
  const allMultipleChoice = exam.questions.every((question) => question.type === "multiple_choice");
  const teacherAllowsInstantScore = allMultipleChoice;
  const score = calculateMultipleChoiceScore(exam, answers);
  const feedback = getFeedbackVisibility({ allAutoGradable: allMultipleChoice, teacherAllowsInstantScore });
  const sections = groupResultSections(exam.questions);
  const answeredCount = exam.questions.filter((question) => Boolean(answers[question.id])).length;
  const gradingStatus = serverResult?.grading?.status ?? (teacherAllowsInstantScore ? "completed" : "waiting_for_grading");
  const serverScore = serverResult?.grading && serverResult.grading.maxScore > 0
    ? Math.round((serverResult.grading.finalScore / serverResult.grading.maxScore) * 100)
    : undefined;

  React.useEffect(() => {
    api
      .getResult(runtime)
      .then((result) => {
        setServerResult(result);
        setResultError("");
      })
      .catch((error) => {
        setResultError(error instanceof Error ? error.message : "result_lookup_failed");
      });
  }, [api, runtime]);

  return (
    <SecureExamShell title={exam.title} subtitle="Receipt submit dan ringkasan hasil ujian." mode="receipt" receipt allowUnsecure={exam.securityMode === "unsecure_allowed"}>
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
            Submission Result
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            {exam.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Halaman ini menjadi bukti submit final. Jika exam seluruhnya multiple choice dan guru mengizinkan instant grading, nilai langsung ditampilkan di sini.
          </p>
        </div>
        <Badge variant="success">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Submitted
        </Badge>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <MetricCard label="Receipt" value="Issued" detail="Digital receipt tersedia" icon={FileCheck2} />
        <MetricCard label="Answered" value={`${answeredCount}/${exam.questions.length}`} detail="Jawaban diterima" icon={ClipboardCheck} />
        <MetricCard label="Grading" value={serverResult?.ready ? "Ready" : gradingStatus} detail={serverResult?.message ?? (teacherAllowsInstantScore ? "MC auto-calculate" : "Menunggu koreksi")} icon={Gauge} />
        <MetricCard label="Integrity" value="Stored" detail="Append-only inbox" icon={ShieldCheck} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel className="p-5">
          {resultError ? (
            <Alert tone="warning" title="Result server belum terbaca" description={`${resultError}. Receipt query string tetap ditampilkan sebagai fallback.`} />
          ) : null}
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-2xl bg-[color:var(--brand-soft)] p-3 text-[color:var(--brand)]">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-lg">Digital Receipt</p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                Simpan receipt ini sebagai bukti jawaban sudah diterima sistem.
              </p>
            </div>
          </div>
          <div className="rounded-[24px] border border-[color:var(--brand)] bg-[color:var(--brand-soft)] p-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--brand-strong)]">Receipt ID</p>
            <p className="mt-2 break-all font-display text-2xl font-bold text-[color:var(--foreground)]">{receipt}</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
              <p className="text-sm font-semibold">Submission path</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                Client autosave → submit final → append-only inbox → receipt issued → async relay.
              </p>
            </div>
            <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
              <p className="text-sm font-semibold">Next status</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                {teacherAllowsInstantScore ? "Score calculated immediately because all questions are auto-gradable." : "Submission menunggu grading manual/async karena ada essay atau short answer."}
              </p>
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          {feedback.visible ? (
            <Panel className="border-[color:var(--brand)] p-5">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-[color:var(--brand-soft)] p-3 text-[color:var(--brand)]">
                  <Gauge className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Instant Score</p>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    Guru mengizinkan nilai langsung karena seluruh soal multiple choice.
                  </p>
                </div>
              </div>
              <div className="rounded-[28px] bg-[color:var(--surface-subtle)] p-5 text-center">
                <p className="font-display text-5xl font-bold tracking-tight text-[color:var(--foreground)]">{serverScore ?? score.percentage}</p>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                  {serverResult?.grading ? `${serverResult.grading.finalScore} / ${serverResult.grading.maxScore}` : `${score.earned} / ${score.totalPoints}`} points
                </p>
              </div>
              <Alert
                tone="info"
                title="Score policy"
                description="Score ini mengikuti answer key dan mode scoring guru: all-or-nothing, partial credit, atau percentage."
              />
            </Panel>
          ) : (
            <Panel className="p-5">
              <div className="flex items-start gap-3">
                <Lock className="mt-1 h-5 w-5 text-[color:var(--brand)]" />
                <div>
                  <p className="font-semibold">Nilai belum ditampilkan</p>
                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{sections.length} section jawaban diterima</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    Exam ini memiliki essay/short answer atau guru tidak mengaktifkan instant result. Nilai akan muncul setelah grading selesai.
                  </p>
                </div>
              </div>
            </Panel>
          )}

          <Panel className="p-5">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 h-5 w-5 text-[color:var(--brand)]" />
              <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                Di implementasi backend, halaman ini sebaiknya membaca status dari submission aggregate/read model, bukan menghitung ulang dari query string.
              </p>
            </div>
          </Panel>

          <Link href="/app/learn">
            <Button className="w-full" variant="secondary">Return to Learning</Button>
          </Link>
        </div>
      </div>
      </div>
    </SecureExamShell>
  );
}
