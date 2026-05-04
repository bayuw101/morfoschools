"use client";

import React from "react";
import {
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Lock,
  PlayCircle,
  Search,
  ShieldCheck,
  Youtube,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { Progress } from "@/components/ui/progress";
import { Toast, type ToastItem } from "@/components/ui/toast";
import {
  calculateLearningMetrics,
  filterLearningCourses,
  getNextRecommendedMaterial,
  type LearningCourseRecord,
} from "./learn-domain";

const learningCourses: LearningCourseRecord[] = [
  {
    id: "course-algebra-x",
    title: "Aljabar Linear Dasar",
    teacher: "Guru Matematika",
    subjectGroup: "Matematika X - Pagi",
    progress: 68,
    status: "available",
    prerequisites: ["Placement Test Matematika X selesai"],
    nextModule: "Latihan Persamaan",
    modules: [
      {
        id: "mod-1",
        title: "Konsep Variabel",
        type: "video",
        duration: "12 menit",
        progress: 100,
        resource: "YouTube metadata",
      },
      {
        id: "mod-2",
        title: "Latihan Persamaan",
        type: "document",
        duration: "20 menit",
        progress: 42,
        resource: "Google Drive PDF",
      },
      {
        id: "mod-3",
        title: "Quiz Refleksi",
        type: "article",
        duration: "8 menit",
        progress: 0,
        resource: "Internal note",
      },
    ],
  },
  {
    id: "course-fisika-olimpiade",
    title: "Kinematika Olimpiade",
    teacher: "Guru Fisika",
    subjectGroup: "Olimpiade Fisika",
    progress: 18,
    status: "blocked",
    prerequisites: ["Vektor & Gerak Dasar belum selesai", "Pretest Fisika Olimpiade belum lulus"],
    nextModule: "Gerak Lurus Berubah Beraturan",
    modules: [
      {
        id: "mod-4",
        title: "Gerak Lurus Berubah Beraturan",
        type: "video",
        duration: "25 menit",
        progress: 18,
        resource: "YouTube metadata",
      },
    ],
  },
];

const activityTrail = [
  "Opened Aljabar Linear Dasar • 2 menit lalu",
  "Watched Konsep Variabel sampai 100% • 8 menit lalu",
  "Downloaded Latihan Persamaan.pdf • 12 menit lalu",
  "Prerequisite checked untuk Kinematika Olimpiade • 18 menit lalu",
];

function moduleIcon(type: string) {
  if (type === "video") return Youtube;
  if (type === "document") return FileText;
  return BookOpen;
}

export default function LearnPage() {
  const [selectedCourseId, setSelectedCourseId] = React.useState(learningCourses[0].id);
  const [query, setQuery] = React.useState("");
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const filteredCourses = filterLearningCourses(learningCourses, query);
  const selectedCourse =
    filteredCourses.find((course) => course.id === selectedCourseId) ?? filteredCourses[0] ?? learningCourses[0];
  const selectedModule = getNextRecommendedMaterial(selectedCourse) ?? selectedCourse.modules[0];
  const metrics = calculateLearningMetrics(learningCourses, 18);

  function toast(title: string, description: string, tone: ToastItem["tone"] = "success") {
    setToasts((current) => [
      ...current,
      { id: crypto.randomUUID(), title, description, tone },
    ]);
  }

  function trackEvent(event: "view" | "watch" | "download" | "complete") {
    const messages = {
      view: "Event course_view dicatat async untuk monitoring guru.",
      watch: "Progress video_watch diperbarui tanpa blocking critical path.",
      download: "Download event dicatat; file tetap di Google Drive guru.",
      complete: "Module completion siap menjadi input prerequisites engine.",
    };
    toast("Learning event tracked", messages[event], event === "complete" ? "success" : "info");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            ISSUE-008
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            My Learning
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Student course viewer untuk membuka materi, melihat video, download dokumen,
            dan mark as complete. Semua event dibuat ringan agar bisa dikirim batch ke
            monitoring/prerequisites engine.
          </p>
        </div>
        <div className="w-full lg:w-[320px]">
          <FloatingInput label="Cari course" prefix={<Search className="h-4 w-4" />} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <MetricCard label="Available" value={String(metrics.available)} detail="Course bisa dibuka" icon={BookOpen} />
        <MetricCard label="Completed" value={String(metrics.completed)} detail={`${metrics.averageProgress}% avg progress`} icon={CheckCircle2} />
        <MetricCard label="Blocked" value={String(metrics.blocked)} detail="Menunggu prerequisite" icon={Lock} />
        <MetricCard label="Events Today" value={String(metrics.eventsToday)} detail="View, watch, download" icon={Eye} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="overflow-hidden p-0">
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <h2 className="font-display text-xl font-semibold">Course List</h2>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Course yang eligible muncul aktif; yang belum memenuhi prerequisite tetap terlihat tapi terkunci.
            </p>
          </div>
          <div className="divide-y divide-[color:var(--border)]">
            {filteredCourses.map((course) => {
              const isSelected = course.id === selectedCourse.id;
              const isBlocked = course.status === "blocked";
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`block w-full px-5 py-4 text-left transition hover:bg-[color:var(--surface-subtle)] ${
                    isSelected ? "bg-[color:var(--brand-soft)]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">{course.title}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                        {course.subjectGroup} • {course.teacher}
                      </p>
                    </div>
                    <Badge variant={isBlocked ? "default" : "success"}>
                      {isBlocked ? "Blocked" : "Available"}
                    </Badge>
                  </div>
                  <Progress value={course.progress} className="mt-4" helperText={`Next: ${course.nextModule}`} />
                  {isBlocked ? (
                    <div className="mt-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                      <p className="mb-1 text-xs font-semibold text-[color:var(--foreground)]">
                        Prerequisites belum terpenuhi
                      </p>
                      <ul className="space-y-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
                        {course.prerequisites.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-6">
          {selectedCourse.status === "blocked" ? (
            <Alert
              tone="warning"
              title="Course terkunci oleh prerequisites"
              description="Siswa belum bisa membuka materi ini sampai course/exam prerequisite terpenuhi. Eligibility final nantinya dihitung materialized agar akses cepat."
            />
          ) : null}

          <Panel className="overflow-hidden p-0">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold">{selectedCourse.title}</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                    Current module: {selectedModule.title} • {selectedModule.duration}
                  </p>
                </div>
                <Badge variant={selectedCourse.status === "available" ? "success" : "default"}>
                  {selectedCourse.progress}% progress
                </Badge>
              </div>
            </div>

            <div className="p-5">
              <div className="overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--shell)] text-white shadow-[0_24px_80px_rgba(9,20,35,0.24)]">
                <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.16),transparent_32%),linear-gradient(135deg,#122033,#29486f)]">
                  <div className="text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/12 backdrop-blur">
                      <PlayCircle className="h-9 w-9" />
                    </div>
                    <p className="mt-4 font-display text-xl font-semibold">Video / Document Preview</p>
                    <p className="mt-1 text-sm text-white/70">Embed YouTube/Drive metadata-only preview</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-white/10 p-4">
                  <Button disabled={selectedCourse.status === "blocked"} onClick={() => trackEvent("view")}>
                    <Eye className="h-4 w-4" /> Track View
                  </Button>
                  <Button disabled={selectedCourse.status === "blocked"} variant="secondary" onClick={() => trackEvent("watch")}>
                    <PlayCircle className="h-4 w-4" /> Simulate Watch
                  </Button>
                  <Button disabled={selectedCourse.status === "blocked"} variant="secondary" onClick={() => trackEvent("download")}>
                    <Download className="h-4 w-4" /> Download File
                  </Button>
                  <Button disabled={selectedCourse.status === "blocked"} variant="secondary" onClick={() => trackEvent("complete")}>
                    <CheckCircle2 className="h-4 w-4" /> Mark Complete
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="overflow-hidden p-0">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <h2 className="font-display text-xl font-semibold">Modules</h2>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                Progress module granular untuk completion dan prerequisites.
              </p>
            </div>
            <div className="divide-y divide-[color:var(--border)]">
              {selectedCourse.modules.map((module) => {
                const Icon = moduleIcon(module.type);
                return (
                  <div key={module.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_0.75fr] lg:items-center">
                    <div className="flex gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-[color:var(--foreground)]">{module.title}</p>
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                          {module.resource} • {module.duration}
                        </p>
                      </div>
                    </div>
                    <Progress value={module.progress} helperText={module.progress === 100 ? "Completed" : "In progress"} />
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      <Panel className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[color:var(--brand-strong)]" />
          <h2 className="font-display text-xl font-semibold">Learning Event Trail</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {activityTrail.map((item) => (
            <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4 text-sm text-[color:var(--muted-foreground)]">
              {item}
            </div>
          ))}
        </div>
      </Panel>

      <div className="fixed bottom-5 right-5 z-[95] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((item) => (
          <Toast
            key={item.id}
            toast={item}
            onDismiss={(id) =>
              setToasts((current) =>
                current.filter((toastItem) => toastItem.id !== id),
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
