"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  MessageSquareText,
  PenLine,
  Search,
  Sparkles,
  UserCheck,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { TextareaField } from "@/components/ui/textarea-field";
import { createExamApiClient, resolveExamRuntimeIds, type ManualGradingQueueItem } from "@/lib/exam-api";
import { initialExams } from "../../data";

type SubmissionStatus = "needs_grading" | "partial" | "completed";
type Submission = {
  id: string;
  student: string;
  classSection: string;
  receipt: string;
  submittedAt: string;
  status: SubmissionStatus;
  mcScore: number;
  essayScore: number | null;
  maxScore: number;
  violations: number;
  answer: string;
};

const submissionsSeed: Submission[] = [
  {
    id: "sub-001",
    student: "24001 - Budi Santoso",
    classSection: "10-A",
    receipt: "RCT-MATH-739210",
    submittedAt: "10:42",
    status: "needs_grading",
    mcScore: 10,
    essayScore: null,
    maxScore: 30,
    violations: 0,
    answer:
      "Saya menyelesaikan SPLDV dengan metode eliminasi. Pertama saya menyamakan koefisien salah satu variabel, lalu mengurangkan kedua persamaan agar satu variabel hilang. Setelah nilai variabel pertama ditemukan, nilainya disubstitusikan ke salah satu persamaan awal untuk mendapatkan variabel kedua.",
  },
  {
    id: "sub-002",
    student: "24002 - Siti Aminah",
    classSection: "10-A",
    receipt: "RCT-MATH-739224",
    submittedAt: "10:45",
    status: "partial",
    mcScore: 10,
    essayScore: 14,
    maxScore: 30,
    violations: 2,
    answer:
      "Sistem persamaan bisa dikerjakan dengan substitusi. Saya pilih salah satu persamaan, ubah menjadi x = ... lalu masukkan ke persamaan lainnya. Setelah y dapat, cari x kembali.",
  },
  {
    id: "sub-003",
    student: "24003 - John Doe",
    classSection: "10-B",
    receipt: "RCT-MATH-739251",
    submittedAt: "10:50",
    status: "completed",
    mcScore: 10,
    essayScore: 18,
    maxScore: 30,
    violations: 0,
    answer:
      "Gunakan eliminasi atau substitusi. Eliminasi menghilangkan salah satu variabel dengan menyamakan koefisien, sedangkan substitusi mengganti satu variabel dengan bentuk persamaan lain. Keduanya menghasilkan pasangan solusi yang sama jika dikerjakan benar.",
  },
];

const filters = [
  { label: "All", value: "all" },
  { label: "Needs Grading", value: "needs_grading" },
  { label: "Graded", value: "completed" },
] as const;

function mapManualQueueItem(item: ManualGradingQueueItem): Submission {
  return {
    id: item.attemptId,
    student: item.studentId,
    classSection: "Backend queue",
    receipt: item.receiptId,
    submittedAt: item.gradedAt ? new Date(item.gradedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "server",
    status: item.requiresManualGrading ? "needs_grading" : "completed",
    mcScore: item.autoScore,
    essayScore: item.requiresManualGrading ? null : 0,
    maxScore: item.maxScore,
    violations: 0,
    answer: JSON.stringify(item.questionResults ?? "Jawaban essay tersedia di read model backend.", null, 2),
  };
}

export default function ExamGradingPage() {
  const params = useParams<{ id: string }>();
  const exam = initialExams.find((item) => item.id === params.id) ?? initialExams[0];
  const runtime = React.useMemo(() => resolveExamRuntimeIds(exam.id), [exam.id]);
  const api = React.useMemo(() => createExamApiClient(), []);
  const teacherId = "00000000-0000-4000-8000-000000000201";
  const essayQuestion = exam.questions.find((question) => question.type === "essay") ?? exam.questions[0];
  const [submissions, setSubmissions] = React.useState(submissionsSeed);
  const [serverError, setServerError] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(submissionsSeed[0]?.id ?? "");
  const [filter, setFilter] = React.useState<(typeof filters)[number]["value"]>("needs_grading");
  const [query, setQuery] = React.useState("");
  const [scoreInput, setScoreInput] = React.useState("0");
  const [feedback, setFeedback] = React.useState("Jawaban sudah mencakup metode dan langkah utama. Perjelas kesimpulan akhir agar lebih lengkap.");

  const selectedSubmission = submissions.find((item) => item.id === selectedId) ?? submissions[0];

  React.useEffect(() => {
    api
      .listManualGrading(runtime, teacherId)
      .then((queue) => {
        if (queue.items.length) {
          const mapped = queue.items.map(mapManualQueueItem);
          setSubmissions(mapped);
          setSelectedId(mapped[0]?.id ?? "");
        }
        setServerError("");
      })
      .catch((error) => setServerError(error instanceof Error ? error.message : "list_manual_grading_failed"));
  }, [api, runtime]);

  React.useEffect(() => {
    if (!selectedSubmission) return;
    setScoreInput(String(selectedSubmission.essayScore ?? ""));
  }, [selectedSubmission?.id, selectedSubmission?.essayScore]);

  const filteredSubmissions = submissions.filter((submission) => {
    const statusMatch =
      filter === "all" ||
      (filter === "completed" ? submission.status === "completed" : submission.status === "needs_grading" || submission.status === "partial");
    const queryMatch = submission.student.toLowerCase().includes(query.toLowerCase());
    return statusMatch && queryMatch;
  });

  const needsGrading = submissions.filter((item) => item.status !== "completed").length;
  const completed = submissions.filter((item) => item.status === "completed").length;
  const averageScore = Math.round(
    submissions.reduce((sum, item) => sum + item.mcScore + (item.essayScore ?? 0), 0) /
      Math.max(submissions.filter((item) => item.essayScore !== null).length, 1),
  );

  async function saveGrade() {
    const normalizedScore = Math.max(0, Math.min(Number(scoreInput || 0), Number(essayQuestion.points || 20)));
    try {
      await api.recordManualGrade(runtime, selectedSubmission.id, {
        manualScore: normalizedScore,
        feedback,
        gradedBy: teacherId,
      });
      setServerError("");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "submit_manual_grade_failed");
    }
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === selectedSubmission.id
          ? { ...submission, essayScore: normalizedScore, status: "completed" }
          : submission,
      ),
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href={`/app/exams/${exam.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--brand)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Exam Manager
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            ISSUE-015 • Manual Essay Grading
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Grading Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Review jawaban essay yang menunggu penilaian. Nilai pilihan ganda sudah dihitung worker, guru hanya fokus pada rubrik essay dan feedback.
          </p>
        </div>
        <Button onClick={saveGrade}>
          <CheckCircle2 className="h-4 w-4" /> Save Grade
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Needs grading</p>
          <p className="mt-2 font-display text-3xl font-bold">{needsGrading}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Completed</p>
          <p className="mt-2 font-display text-3xl font-bold text-[color:var(--success)]">{completed}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Average scored</p>
          <p className="mt-2 font-display text-3xl font-bold">{averageScore}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Exam</p>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6">{exam.title}</p>
        </Panel>
      </div>

      <Alert
        tone={serverError ? "warning" : "info"}
        title={serverError ? "Backend grading fallback active" : "Async grading pipeline"}
        description={serverError ? `${serverError}. UI tetap memakai data demo lokal agar guru dapat meninjau alur grading.` : "Multiple choice dinilai oleh worker NATS. Submission dengan essay masuk status WAITING_FOR_GRADING sampai guru mengisi skor manual. Setelah skor essay tersimpan, final score dihitung dan status menjadi COMPLETED."}
      />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel className="overflow-hidden p-0">
          <div className="border-b border-[color:var(--border)] p-5">
            <h2 className="font-display text-xl font-semibold">Submission Queue</h2>
            <div className="mt-4 flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3">
              <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
              <input
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
                placeholder="Cari siswa"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {filters.map((item) => (
                <Button
                  key={item.value}
                  size="sm"
                  variant={filter === item.value ? "primary" : "secondary"}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="max-h-[690px] divide-y divide-[color:var(--border)] overflow-y-auto">
            {filteredSubmissions.map((submission) => {
              const selected = submission.id === selectedSubmission.id;
              return (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => setSelectedId(submission.id)}
                  className={`w-full p-5 text-left transition ${selected ? "bg-[color:var(--brand-soft)]" : "hover:bg-[color:var(--surface-subtle)]"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{submission.student}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{submission.classSection} • {submission.receipt}</p>
                    </div>
                    <Badge variant={submission.status === "completed" ? "success" : "default"}>
                      {submission.status === "completed" ? "Graded" : "Waiting"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {submission.submittedAt}</span>
                    <span>{submission.mcScore + (submission.essayScore ?? 0)} / {submission.maxScore}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="p-0 overflow-hidden">
            <div className="border-b border-[color:var(--border)] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge variant="default"><UserCheck className="mr-1 h-3.5 w-3.5" /> {selectedSubmission.student}</Badge>
                  <h2 className="mt-3 font-display text-2xl font-semibold">Essay Review</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Receipt {selectedSubmission.receipt} • {selectedSubmission.violations} security violations</p>
                </div>
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-5 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Final Score</p>
                  <p className="mt-1 font-display text-2xl font-bold">{selectedSubmission.mcScore + Number(scoreInput || 0)} / {selectedSubmission.maxScore}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
              <div className="space-y-5 p-5">
                <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--brand)]">
                    <MessageSquareText className="h-4 w-4" /> Essay Question
                  </div>
                  <p className="text-sm leading-7 text-[color:var(--foreground)]">{essayQuestion.prompt}</p>
                </div>

                <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--brand)]">
                    <FileText className="h-4 w-4" /> Student Answer
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-[color:var(--foreground)]">{selectedSubmission.answer}</p>
                </div>

                <TextareaField
                  label="Feedback untuk siswa"
                  rows={5}
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                />
              </div>

              <div className="border-t border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5 lg:border-l lg:border-t-0">
                <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                  <div className="mb-4 flex items-center gap-2 font-semibold">
                    <ListChecks className="h-5 w-5 text-[color:var(--brand)]" /> Rubrik
                  </div>
                  <p className="text-sm leading-7 text-[color:var(--muted-foreground)]">{essayQuestion.answerKey}</p>
                </div>

                <div className="mt-5 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Essay Score</label>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max={essayQuestion.points}
                      value={scoreInput}
                      onChange={(event) => setScoreInput(event.target.value)}
                      className="h-14 w-28 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-4 text-xl font-bold outline-none focus:border-[color:var(--brand)]"
                    />
                    <span className="text-sm font-semibold text-[color:var(--muted-foreground)]">/ {essayQuestion.points} pts</span>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[0, 10, 15, Number(essayQuestion.points || 20)].map((score) => (
                      <Button key={score} size="sm" variant="secondary" onClick={() => setScoreInput(String(score))}>
                        {score}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-[color:var(--brand)]" /> MC Worker Result</p>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Multiple choice: {selectedSubmission.mcScore} pts sudah dihitung otomatis.</p>
                  </div>
                  <Button onClick={saveGrade} className="w-full">
                    <PenLine className="h-4 w-4" /> Save Essay Grade
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[color:var(--brand-soft)] p-3 text-[color:var(--brand)]">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Low-spec friendly grading</p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Dashboard ini membaca submission yang sudah diproses worker. Guru tidak melakukan query berat ke jawaban mentah saat traffic submit sedang tinggi.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
