"use client";

import React from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  Copy,
  Edit3,
  Gauge,
  FileQuestion,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { initialExams } from "./data";
import { calculateExamMetrics, filterExams, getExamEmptyState, getExamStatus } from "./exam-domain";

export default function ExamsPage() {
  const [query, setQuery] = React.useState("");
  const exams = initialExams;

  const filteredExams = filterExams(exams, query);
  const metrics = calculateExamMetrics(exams);
  const emptyState = getExamEmptyState(query);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            ISSUE-009
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Exams Management
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Daftar exam seperti Course Directory. Buka exam untuk konfigurasi dan
            kelola question manager dalam halaman detail dua kolom.
          </p>
        </div>
        <Link href="/app/exams/new">
          <Button>
            <Plus className="h-4 w-4" /> Create Exam
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <MetricCard
          label="Exams"
          value={String(metrics.total)}
          detail="Draft, scheduled, published"
          icon={FileQuestion}
        />
        <MetricCard
          label="Questions"
          value={String(metrics.questions)}
          detail="Soal tersusun"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Scheduled"
          value={String(metrics.scheduled)}
          detail={`${metrics.submissions} submissions masuk`}
          icon={CalendarClock}
        />
      </div>

      <Alert
        tone="info"
        title="Exam reliability path"
        description="Listing exam tetap ringan. Detail manager dipisah ke halaman khusus agar konfigurasi, gate jadwal, dan bank soal tidak membuat directory berantakan."
      />

      <Panel className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-[color:var(--border)] px-5 py-3 lg:grid-cols-[1fr_280px] lg:items-center">
          <h2 className="font-display text-xl font-semibold">Exam Directory</h2>
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
              placeholder="Search exam title"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {filteredExams.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-display text-lg font-semibold text-[color:var(--foreground)]">{emptyState.title}</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[color:var(--muted-foreground)]">{emptyState.description}</p>
            </div>
          ) : null}
          {filteredExams.map((exam) => {
            const status = getExamStatus(exam.status);
            return (
            <div
              key={exam.id}
              className="grid gap-4 px-5 py-4 xl:grid-cols-[1.1fr_0.72fr_0.7fr_0.42fr_0.42fr_auto] xl:items-center"
            >
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">
                  {exam.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--muted-foreground)]">
                  {exam.rules}
                </p>
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                <span className="font-medium text-[color:var(--foreground)]">
                  {exam.subject}
                </span>
                <br />
                <span className="inline-flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5" /> {exam.duration}
                </span>
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                <span className="font-medium text-[color:var(--foreground)]">
                  Targeting
                </span>
                <br />
                {exam.targeting.subjectGroups.length} groups • {" "}
                {exam.targeting.classSections.length} classes • {" "}
                {exam.targeting.students.length} students
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant={status.tone}>
                  {status.label}
                </Badge>
                <span className="text-xs text-[color:var(--muted-foreground)]">
                  {exam.gateRules.length} gates
                </span>
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                <span className="font-semibold text-[color:var(--foreground)]">
                  {exam.questions.length} questions
                </span>
                <br />
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {exam.submissions} subs
                </span>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="secondary">
                  <Copy className="h-4 w-4" /> Duplicate
                </Button>
                <Link href={`/app/exam-gate/${exam.id}`}>
                  <Button size="sm" variant="secondary">
                    <PlayCircle className="h-4 w-4" /> Take
                  </Button>
                </Link>
                <Link href={`/app/exams/${exam.id}/monitor`}>
                  <Button size="sm" variant="secondary">
                    <BarChart3 className="h-4 w-4" /> Monitor
                  </Button>
                </Link>
                <Link href={`/app/exams/${exam.id}/grading`}>
                  <Button size="sm" variant="secondary">
                    <ClipboardCheck className="h-4 w-4" /> Grade
                  </Button>
                </Link>
                <Link href={`/app/exams/${exam.id}/performance`}>
                  <Button size="sm" variant="secondary">
                    <Gauge className="h-4 w-4" /> Perf
                  </Button>
                </Link>
                <Link href={`/app/exams/${exam.id}`}>
                  <Button size="sm" variant="secondary">
                    <Edit3 className="h-4 w-4" /> Manage
                  </Button>
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
