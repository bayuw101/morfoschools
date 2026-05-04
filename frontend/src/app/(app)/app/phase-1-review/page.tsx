"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Gauge,
  GraduationCap,
  Layers3,
  MonitorPlay,
  PenTool,
  School,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { calculateBackendReadinessSummary } from "./phase-review-domain";

const reviewFlows = [
  {
    title: "Admin foundation",
    icon: ShieldCheck,
    status: "ready",
    description: "Validasi tenant, user, class section, dan subject group sebelum schema final.",
    links: [
      { label: "Tenants", href: "/app/tenants" },
      { label: "Users", href: "/app/users" },
      { label: "Students", href: "/app/students" },
      { label: "Classes", href: "/app/classes" },
      { label: "Subject Groups", href: "/app/subject-groups" },
    ],
  },
  {
    title: "Course lifecycle",
    icon: BookOpen,
    status: "ready",
    description: "Guru membuat course, mengatur audience, prerequisites, Google upload, lalu murid belajar.",
    links: [
      { label: "Course Management", href: "/app/courses" },
      { label: "Student Learn", href: "/app/learn" },
      { label: "Course Monitoring", href: "/app/course-monitoring" },
    ],
  },
  {
    title: "Exam lifecycle",
    icon: PenTool,
    status: "ready",
    description: "Authoring, targeting, gate, secure take exam, result receipt, live monitor, grading, dan load test.",
    links: [
      { label: "Exam Directory", href: "/app/exams" },
      { label: "Exam Manager", href: "/app/exams/exam-mid-math-x" },
      { label: "Exam Gate", href: "/app/exam-gate/exam-mid-math-x" },
      { label: "Take Exam", href: "/app/take-exam/exam-mid-math-x" },
      { label: "Monitor", href: "/app/exams/exam-mid-math-x/monitor" },
      { label: "Grading", href: "/app/exams/exam-mid-math-x/grading" },
      { label: "Load Test", href: "/app/exams/exam-mid-math-x/performance" },
    ],
  },
];

const dbReadiness = [
  { id: "tenant", category: "data" as const, label: "Tenant boundary", detail: "Semua core table perlu tenant_id dan policy per sekolah.", ready: true, icon: School },
  { id: "academic", category: "data" as const, label: "Academic model", detail: "class_sections administratif; course_offerings/teaching_assignments/enrollments akademik.", ready: true, icon: Layers3 },
  { id: "eligibility", category: "data" as const, label: "Exam eligibility", detail: "exam_eligible_students materialized saat publish/recalculate.", ready: true, icon: GraduationCap },
  { id: "submission", category: "reliability" as const, label: "Submission path", detail: "exam_submission_inbox append-only + receipt sebelum grading.", ready: true, icon: Database },
  { id: "grading", category: "reliability" as const, label: "Async grading", detail: "NATS worker untuk MC; WAITING_FOR_GRADING untuk essay.", ready: true, icon: ClipboardCheck },
  { id: "operability", category: "operability" as const, label: "Operability", detail: "Monitor, audit violation, dan load-test evidence harus punya table/event sendiri.", ready: true, icon: MonitorPlay },
];

export default function PhaseOneReviewPage() {
  const readinessSummary = calculateBackendReadinessSummary(dbReadiness);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            Phase 1 Final Review
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Product Flow Lock sebelum DB & Backend
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Satu halaman untuk mengecek seluruh lifecycle LMS Morfosis sebelum kita mengunci domain model, membuat struktur database, dan mulai implementasi backend Go.
          </p>
        </div>
        <Link href="/app/exams/exam-mid-math-x/performance">
          <Button>
            <Gauge className="h-4 w-4" /> Review Load Test
          </Button>
        </Link>
      </div>

      <Alert
        tone="info"
        title="Tujuan review ini"
        description="Jika semua flow di bawah sudah cocok secara produk, next sprint adalah DB & Backend Foundation: schema PostgreSQL, module boundaries Go, migration, seed, auth/tenant middleware, dan API contract."
      />

      <div className="grid gap-5 md:grid-cols-4">
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">UI flows</p>
          <p className="mt-2 font-display text-3xl font-bold">14+</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Exam surfaces</p>
          <p className="mt-2 font-display text-3xl font-bold">8</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Backend readiness</p>
          <p className="mt-2 font-display text-3xl font-bold text-[color:var(--success)]">Ready</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Next sprint</p>
          <p className="mt-2 font-display text-xl font-bold">{readinessSummary.ready}/{readinessSummary.total} ready</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {reviewFlows.map((flow) => {
          const Icon = flow.icon;
          return (
            <Panel key={flow.title} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-2xl bg-[color:var(--brand-soft)] p-3 text-[color:var(--brand)]">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="success"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {flow.status}</Badge>
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">{flow.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">{flow.description}</p>
              <div className="mt-5 grid gap-2">
                {flow.links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button variant="secondary" className="w-full justify-between">
                      {link.label}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">DB/Backend Readiness Checklist</h2>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Ini adalah domain decisions yang sudah muncul dari UI dan harus diterjemahkan ke schema.</p>
          </div>
          <Badge variant="default">Source of truth sebelum migration</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dbReadiness.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <Icon className="h-4 w-4 text-[color:var(--brand)]" /> {item.label}
                </div>
                <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-green-100 p-3 text-green-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Keputusan setelah review</h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
              Jika kamu sudah puas dengan flow ini, task berikutnya bukan menambah UI lagi, tetapi membuat dokumen DB schema + backend module plan, lalu mulai implementasi Go backend secara TDD.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
