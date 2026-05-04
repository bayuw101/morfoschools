"use client";

import React from "react";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  PlayCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FloatingInput } from "@/components/ui/floating-input";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { Progress } from "@/components/ui/progress";
import {
  calculateCourseMonitoringMetrics,
  filterCourseHealth,
  filterStudentActivities,
  getCourseRiskAlert,
  type CourseHealthRecord,
  type StudentActivityRecord,
} from "./course-monitoring-domain";

const courseHealth: CourseHealthRecord[] = [
  {
    title: "Aljabar Linear Dasar",
    audience: "10-A + Matematika X - Pagi",
    teacher: "Guru Matematika",
    students: 38,
    viewed: 34,
    downloaded: 21,
    completed: 26,
    videoWatch: 78,
    lastActivity: "5 menit lalu",
    risk: "low",
  },
  {
    title: "Kinematika Olimpiade",
    audience: "11-B, 12-C + Olimpiade Fisika",
    teacher: "Guru Fisika",
    students: 24,
    viewed: 17,
    downloaded: 9,
    completed: 8,
    videoWatch: 46,
    lastActivity: "28 menit lalu",
    risk: "medium",
  },
  {
    title: "Bahasa Indonesia Remedial",
    audience: "Exception per siswa",
    teacher: "Guru Bahasa",
    students: 18,
    viewed: 11,
    downloaded: 7,
    completed: 5,
    videoWatch: 41,
    lastActivity: "1 jam lalu",
    risk: "medium",
  },
];

const studentActivity: StudentActivityRecord[] = [
  {
    name: "Alya Putri",
    classSection: "10-A",
    course: "Aljabar Linear Dasar",
    status: "completed",
    video: "92% watched",
    downloads: "2 files",
    lastSeen: "Baru saja",
  },
  {
    name: "Bima Prakoso",
    classSection: "10-A",
    course: "Aljabar Linear Dasar",
    status: "watching",
    video: "64% watched",
    downloads: "1 file",
    lastSeen: "7 menit lalu",
  },
  {
    name: "Citra Maharani",
    classSection: "11-B",
    course: "Kinematika Olimpiade",
    status: "blocked",
    video: "0% watched",
    downloads: "0 files",
    lastSeen: "Belum aktif",
  },
  {
    name: "Daffa Ramadhan",
    classSection: "12-C",
    course: "Kinematika Olimpiade",
    status: "viewed",
    video: "38% watched",
    downloads: "1 file",
    lastSeen: "23 menit lalu",
  },
];

const resourceEvents = [
  {
    type: "video",
    title: "Konsep Variabel",
    course: "Aljabar Linear Dasar",
    metric: "34 views • avg 78% watch",
    icon: PlayCircle,
  },
  {
    type: "download",
    title: "Latihan Persamaan.pdf",
    course: "Aljabar Linear Dasar",
    metric: "21 downloads",
    icon: Download,
  },
  {
    type: "video",
    title: "GLBB dan Grafik",
    course: "Kinematika Olimpiade",
    metric: "17 views • avg 46% watch",
    icon: PlayCircle,
  },
];

export default function CourseMonitoringPage() {
  const [query, setQuery] = React.useState("");
  const metrics = calculateCourseMonitoringMetrics(courseHealth, 152);
  const filteredCourseHealth = filterCourseHealth(courseHealth, query);
  const filteredStudentActivity = filterStudentActivities(studentActivity, query);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            ISSUE-008.1
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Course Monitoring
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Monitor siapa yang sudah membuka course, melihat video, download file,
            dan menyelesaikan materi. Data ini nantinya dipakai juga oleh
            prerequisites engine untuk course dan exam eligibility.
          </p>
        </div>
        <div className="w-full lg:w-[320px]">
          <FloatingInput
            label="Cari siswa/course"
            prefix={<Search className="h-4 w-4" />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <MetricCard
          label="View Rate"
          value={`${metrics.viewRate}%`}
          detail={`${metrics.totalViewed}/${metrics.totalStudents} siswa sudah membuka course`}
          icon={Eye}
        />
        <MetricCard
          label="Downloads"
          value={String(metrics.totalDownloaded)}
          detail="File Drive/PDF diunduh"
          icon={Download}
        />
        <MetricCard
          label="Completion"
          value={`${metrics.completionRate}%`}
          detail="Siap dipakai sebagai prerequisite"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Tracked Events"
          value={String(metrics.trackedEvents)}
          detail="View, watch, download, complete"
          icon={Activity}
        />
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="font-display text-xl font-semibold">Course Health</h2>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Ringkasan engagement per course untuk guru/admin sekolah.
          </p>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {filteredCourseHealth.map((course) => {
            const alert = getCourseRiskAlert(course.risk);
            return (
            <div
              key={course.title}
              className="grid gap-4 px-5 py-4 xl:grid-cols-[1.1fr_0.65fr_0.8fr_0.8fr_0.5fr] xl:items-center"
            >
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">
                  {course.title}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                  {course.audience} • {course.teacher}
                </p>
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                <span className="font-medium text-[color:var(--foreground)]">
                  {course.viewed}/{course.students}
                </span>{" "}
                viewed
                <br />
                {course.downloaded} downloads
              </div>
              <Progress
                value={course.videoWatch}
                label="Video watch"
                helperText="Average watched duration"
              />
              <Progress
                value={Math.round((course.completed / course.students) * 100)}
                label="Completion"
                helperText={`${course.completed} siswa selesai`}
              />
              <div className="flex flex-col gap-2">
                <Badge variant={alert.tone}>
                  {alert.label}
                </Badge>
                <span className="text-xs text-[color:var(--muted-foreground)]">
                  {course.lastActivity}
                </span>
              </div>
            </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel className="overflow-hidden p-0">
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <h2 className="font-display text-xl font-semibold">
              Student Activity
            </h2>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Evidence trail untuk review guru: viewed, watched, download, dan
              blocked by prerequisite.
            </p>
          </div>
          <div className="divide-y divide-[color:var(--border)]">
            {filteredStudentActivity.map((student) => (
              <div
                key={`${student.name}-${student.course}`}
                className="grid gap-4 px-5 py-4 lg:grid-cols-[0.8fr_1fr_0.65fr_0.55fr] lg:items-center"
              >
                <div>
                  <p className="font-semibold text-[color:var(--foreground)]">
                    {student.name}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                    {student.classSection}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[color:var(--foreground)]">
                    {student.course}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                    {student.video} • {student.downloads}
                  </p>
                </div>
                <Badge
                  variant={student.status === "completed" ? "success" : "default"}
                >
                  {student.status}
                </Badge>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  {student.lastSeen}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-4">
            <h2 className="font-display text-xl font-semibold">
              Resource Events
            </h2>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Event ringan yang bisa disimpan di Postgres/ClickHouse tanpa masuk
              critical path ujian.
            </p>
          </div>
          <div className="space-y-3">
            {resourceEvents.map((event) => {
              const Icon = event.icon;
              return (
                <div
                  key={`${event.title}-${event.type}`}
                  className="flex gap-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[color:var(--brand-strong)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--foreground)]">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
                      {event.course} • {event.metric}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-[color:var(--brand-strong)]" />
              Low-spec server note
            </div>
            <p className="text-xs leading-5 text-[color:var(--muted-foreground)]">
              Tracking event harus batched dan asynchronous. Video/file tetap BYO
              Google/YouTube; LMS hanya menyimpan metadata dan engagement event.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
