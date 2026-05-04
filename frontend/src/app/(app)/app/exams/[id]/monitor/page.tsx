"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Database,
  EyeOff,
  Filter,
  MonitorPlay,
  RefreshCw,
  Search,
  ShieldAlert,
  Signal,
  Users,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getSession } from "@/lib/auth";
import { createExamApiClient, resolveExamRuntimeIds, type ExamMonitorReadModel, type ExamRuntimeIds } from "@/lib/exam-api";
import type { Exam } from "../../data";
import { getExamDetail } from "../../exam-api";

// Simulated live data types
type StudentStatus = "online" | "offline" | "submitted" | "violation";
type FeedEvent = {
  id: string;
  time: string;
  student: string;
  type: "submit" | "violation" | "offline";
  detail: string;
};

export default function ExamMonitorDashboard() {
  const params = useParams<{ id: string }>();
  const [exam, setExam] = React.useState<Exam | null>(null);
  const [runtime, setRuntime] = React.useState<ExamRuntimeIds | null>(null);
  const api = React.useMemo(() => createExamApiClient(), []);
  const [serverMonitor, setServerMonitor] = React.useState<ExamMonitorReadModel | null>(null);
  const [serverError, setServerError] = React.useState("");

  React.useEffect(() => {
    getExamDetail(params.id)
      .then((item) => {
        setExam(item);
        const session = getSession();
        setRuntime(resolveExamRuntimeIds(item.id, { tenantId: session?.tenantId, studentId: session?.userId }));
      })
      .catch((error) => setServerError(error instanceof Error ? error.message : "exam_detail_load_failed"));
  }, [params.id]);

  // Simulation state
  const [activeStudents, setActiveStudents] = React.useState(142);
  const [offlineStudents, setOfflineStudents] = React.useState(3);
  const [submittedCount, setSubmittedCount] = React.useState(28);
  const [inboxQueue, setInboxQueue] = React.useState(0);
  const [feed, setFeed] = React.useState<FeedEvent[]>([
    { id: "1", time: "10:42:15", student: "Budi Santoso", type: "submit", detail: "Submitting 45 answers" },
    { id: "2", time: "10:41:02", student: "Siti Aminah", type: "violation", detail: "Exited fullscreen mode" },
    { id: "3", time: "10:39:45", student: "Andi Saputra", type: "offline", detail: "Lost connection for 2m" },
    { id: "4", time: "10:38:12", student: "Dewi Lestari", type: "violation", detail: "Tab hidden / App switch" },
  ]);

  React.useEffect(() => {
    if (!runtime) return;
    const teacherId = getSession()?.userId;
    if (!teacherId) {
      setServerError("teacher_session_missing");
      return;
    }
    api
      .getMonitor(runtime, teacherId)
      .then((monitor) => {
        setServerMonitor(monitor);
        setServerError("");
      })
      .catch((error) => setServerError(error instanceof Error ? error.message : "monitor_lookup_failed"));
  }, [api, runtime]);

  const displayedActiveStudents = serverMonitor?.summary.startedAttempts ?? activeStudents;
  const displayedOfflineStudents = serverMonitor?.summary.blockedStudents ?? offlineStudents;
  const displayedSubmittedCount = serverMonitor?.summary.completedAttempts ?? submittedCount;
  const displayedInboxQueue = serverMonitor?.summary.unrelayedSubmissions ?? inboxQueue;
  const displayedFeed = serverMonitor
    ? [
        ...serverMonitor.latestReceipts.map((receipt) => ({
          id: receipt.receiptId,
          time: new Date(receipt.receivedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          student: receipt.studentId,
          type: "submit" as const,
          detail: `${receipt.submissionKind} • ${receipt.relayed ? "relayed" : "waiting relay"}`,
        })),
        ...serverMonitor.securityEvents.map((event) => ({
          id: event.id,
          time: new Date(event.occurredAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          student: event.studentId,
          type: "violation" as const,
          detail: `${event.eventType} • ${event.severity}`,
        })),
      ]
    : feed;

  // Simulate incoming events as fallback when backend is not reachable
  React.useEffect(() => {
    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand > 0.7) {
        // Someone submitted
        setInboxQueue((prev) => prev + 1);
        setActiveStudents((prev) => Math.max(0, prev - 1));
        
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        
        setFeed((prev) => [
          {
            id: crypto.randomUUID(),
            time: timeStr,
            student: `Siswa ${Math.floor(Math.random() * 900) + 100}`,
            type: "submit",
            detail: "Submitting answers to inbox...",
          },
          ...prev.slice(0, 49),
        ]);

        // Process queue after a short delay (simulating NATS worker)
        setTimeout(() => {
          setInboxQueue((prev) => Math.max(0, prev - 1));
          setSubmittedCount((prev) => prev + 1);
        }, 1500);
      } else if (rand > 0.6) {
        // Violation occurred
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        
        setFeed((prev) => [
          {
            id: crypto.randomUUID(),
            time: timeStr,
            student: `Siswa ${Math.floor(Math.random() * 900) + 100}`,
            type: "violation",
            detail: Math.random() > 0.5 ? "Exited fullscreen mode" : "Tab hidden / App switch",
          },
          ...prev.slice(0, 49),
        ]);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  if (!exam) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Panel className="p-6 text-sm text-[color:var(--muted-foreground)]">
          {serverError ? `Gagal memuat monitor: ${serverError}` : "Memuat detail exam dan monitor backend..."}
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <Link
            href={`/app/exams/${exam.id}`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--brand)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Exam Manager
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[color:var(--foreground)]">
              Live Monitor
            </h1>
            <Badge variant="success" className="animate-pulse">
              <Signal className="mr-1 h-3.5 w-3.5" /> Live
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            {exam.title} • {exam.securityMode === "secure_required" ? "Strict Secure Mode" : "Unsecure Mode"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary">
            <Filter className="mr-2 h-4 w-4" /> Filter Log
          </Button>
          <Button variant="secondary">
            <Search className="mr-2 h-4 w-4" /> Cari Siswa
          </Button>
        </div>
      </div>

      {/* Shock Absorber Alert */}
      <Alert
        tone={serverError ? "warning" : "info"}
        title={serverError ? "Backend monitor fallback active" : "Ingestion Shock Absorber Active"}
        description={serverError ? `${serverError}. UI memakai simulasi lokal sampai backend tersedia.` : "Penerimaan jawaban ujian dialihkan ke Inbox Append-only dan antrean NATS. Mencegah database utama down saat ratusan murid mengklik submit secara bersamaan di akhir waktu."}
        className="mb-8"
      />

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Top Metrics Cards */}
        <Panel className="p-5 flex flex-col justify-between h-32">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-[color:var(--muted-foreground)]">Mengerjakan</p>
            <div className="rounded-xl bg-[color:var(--brand-soft)] p-2">
              <Users className="h-5 w-5 text-[color:var(--brand)]" />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold">{displayedActiveStudents}</p>
            <p className="text-xs text-[color:var(--muted-foreground)] mt-1">Siswa online & sinkron</p>
          </div>
        </Panel>

        <Panel className="p-5 flex flex-col justify-between h-32 border-amber-200 bg-amber-50/50">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-amber-700">Offline / Sync Delay</p>
            <div className="rounded-xl bg-amber-100 p-2">
              <WifiOff className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-amber-700">{displayedOfflineStudents}</p>
            <p className="text-xs text-amber-600/80 mt-1">Menunggu reconnect</p>
          </div>
        </Panel>

        <Panel className="p-5 flex flex-col justify-between h-32">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-[color:var(--muted-foreground)]">Inbox Queue (NATS)</p>
            <div className="rounded-xl bg-[color:var(--brand-soft)] p-2">
              <Database className="h-5 w-5 text-[color:var(--brand)]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <p className="font-display text-3xl font-bold">{displayedInboxQueue}</p>
              {displayedInboxQueue > 0 && <RefreshCw className="h-4 w-4 animate-spin text-[color:var(--muted-foreground)]" />}
            </div>
            <p className="text-xs text-[color:var(--muted-foreground)] mt-1">Sedang diproses worker</p>
          </div>
        </Panel>

        <Panel className="p-5 flex flex-col justify-between h-32 border-green-200 bg-green-50/50">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-green-700">Selesai (Graded)</p>
            <div className="rounded-xl bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-green-700">{displayedSubmittedCount}</p>
            <p className="text-xs text-green-600/80 mt-1">Tersimpan aman</p>
          </div>
        </Panel>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Left Column: Live Feed */}
        <div className="lg:col-span-2 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-[color:var(--brand)]" />
              Live Activity Feed
            </h2>
            <Badge variant="default">Auto-refresh</Badge>
          </div>
          
          <Panel className="flex-1 overflow-y-auto p-0">
            <div className="divide-y divide-[color:var(--border)]">
              {displayedFeed.map((event) => (
                <div key={event.id} className="p-4 flex items-start gap-4 hover:bg-[color:var(--surface-subtle)] transition-colors">
                  <div className="mt-1 shrink-0">
                    {event.type === "submit" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {event.type === "violation" && <ShieldAlert className="h-5 w-5 text-red-500" />}
                    {event.type === "offline" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate text-[color:var(--foreground)]">{event.student}</p>
                      <span className="text-xs text-[color:var(--muted-foreground)] tabular-nums">{event.time}</span>
                    </div>
                    <p className={`text-sm mt-1 ${event.type === "violation" ? "text-red-600 font-medium" : "text-[color:var(--muted-foreground)]"}`}>
                      {event.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right Column: Violation Leaderboard / Summary */}
        <div className="flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Top Violations
            </h2>
          </div>
          
          <Panel className="p-5">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-semibold text-[color:var(--foreground)]">Siti Aminah</span>
                  <span className="font-bold text-red-600">4x</span>
                </div>
                <div className="h-2 rounded-full bg-[color:var(--surface-subtle)] overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: "80%" }} />
                </div>
                <p className="text-xs text-[color:var(--muted-foreground)] mt-1">Sering keluar fullscreen</p>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-semibold text-[color:var(--foreground)]">Dewi Lestari</span>
                  <span className="font-bold text-red-600">2x</span>
                </div>
                <div className="h-2 rounded-full bg-[color:var(--surface-subtle)] overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: "40%" }} />
                </div>
                <p className="text-xs text-[color:var(--muted-foreground)] mt-1">Pindah tab</p>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-semibold text-[color:var(--foreground)]">Budi Santoso</span>
                  <span className="font-bold text-red-600">1x</span>
                </div>
                <div className="h-2 rounded-full bg-[color:var(--surface-subtle)] overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: "20%" }} />
                </div>
                <p className="text-xs text-[color:var(--muted-foreground)] mt-1">Keluar fullscreen</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[color:var(--border)]">
              <p className="text-sm font-semibold mb-4 text-[color:var(--foreground)]">Action Recommendations</p>
              <Button variant="secondary" className="w-full justify-start text-red-600 bg-red-50 hover:bg-red-100 border-red-200">
                <AlertTriangle className="mr-2 h-4 w-4" /> Force Kick Top Violators
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function WifiOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.82" />
    </svg>
  );
}
