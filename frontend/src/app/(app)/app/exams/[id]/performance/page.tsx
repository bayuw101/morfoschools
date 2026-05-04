"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Network,
  Play,
  ServerCog,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { initialExams } from "../../data";

type Scenario = {
  id: string;
  name: string;
  students: number;
  ramp: string;
  duration: string;
  expected: string;
};

const scenarios: Scenario[] = [
  {
    id: "baseline-500",
    name: "Baseline 500 siswa",
    students: 500,
    ramp: "5 menit",
    duration: "12 menit",
    expected: "VPS 2GB stabil, p95 submit < 700ms",
  },
  {
    id: "spike-1000",
    name: "Spike akhir waktu 1000 siswa",
    students: 1000,
    ramp: "30 detik",
    duration: "3 menit",
    expected: "Inbox queue naik, API tetap merespons receipt",
  },
  {
    id: "offline-replay",
    name: "Offline replay sync",
    students: 300,
    ramp: "2 menit",
    duration: "8 menit",
    expected: "Jittered sync tidak membuat thundering herd",
  },
];

const bottlenecks = [
  { label: "Postgres connections", status: "guarded", detail: "PgBouncer transaction pooling aktif" },
  { label: "Insert hot table", status: "guarded", detail: "Daily partition + append-only inbox" },
  { label: "Worker lag", status: "watch", detail: "Monitor NATS consumer lag < 5s" },
  { label: "Receipt latency", status: "guarded", detail: "Receipt dibuat sebelum proses grading" },
];

export default function ExamPerformancePage() {
  const params = useParams<{ id: string }>();
  const exam = initialExams.find((item) => item.id === params.id) ?? initialExams[0];
  const [selectedScenario, setSelectedScenario] = React.useState(scenarios[0]);
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(68);

  React.useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          setRunning(false);
          return 100;
        }
        return current + 4;
      });
    }, 700);
    return () => window.clearInterval(interval);
  }, [running]);

  function runSimulation() {
    setProgress(0);
    setRunning(true);
  }

  const p95 = selectedScenario.students >= 1000 ? 642 : 388;
  const queuePeak = selectedScenario.students >= 1000 ? 287 : 72;
  const dbCpu = selectedScenario.students >= 1000 ? 62 : 34;
  const workerLag = selectedScenario.id === "offline-replay" ? 4.8 : selectedScenario.students >= 1000 ? 3.1 : 1.2;

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
            ISSUE-016 • Performance Testing
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Exam Load Test Lab
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Review surface untuk memvalidasi strategi low-spec: 500-1000 siswa submit serentak tetap aman karena API hanya menulis append-only inbox dan mengembalikan receipt.
          </p>
        </div>
        <Button onClick={runSimulation} disabled={running}>
          <Play className="h-4 w-4" /> {running ? "Running..." : "Run Simulation"}
        </Button>
      </div>

      <Alert
        tone="warning"
        title="Target VPS low-spec"
        description="Simulasi ini memodelkan deployment 2GB RAM: Go API, PgBouncer, Postgres, NATS JetStream, dan Next.js dalam Docker Compose. Fokusnya bukan throughput mentah, tapi menjaga receipt path tetap cepat saat spike."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => setSelectedScenario(scenario)}
            className={`rounded-[28px] border p-5 text-left transition ${
              selectedScenario.id === scenario.id
                ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]"
                : "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--brand)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{scenario.name}</p>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{scenario.expected}</p>
              </div>
              <Badge variant="default">{scenario.students}</Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-[color:var(--muted-foreground)]">
              <span>Ramp: {scenario.ramp}</span>
              <span>Duration: {scenario.duration}</span>
            </div>
          </button>
        ))}
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-[color:var(--border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Simulation Result</h2>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{selectedScenario.name} untuk {exam.title}</p>
            </div>
            <Badge variant={progress === 100 ? "success" : "default"}>{progress === 100 ? "Completed" : running ? "Running" : "Preview"}</Badge>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[color:var(--surface-subtle)]">
            <div className="h-full rounded-full bg-[color:var(--brand)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-4">
          <Metric icon={Timer} label="Receipt p95" value={`${p95}ms`} detail="API response" tone={p95 < 800 ? "good" : "warn"} />
          <Metric icon={Database} label="Inbox queue peak" value={String(queuePeak)} detail="Append-only rows" tone="good" />
          <Metric icon={Cpu} label="DB CPU peak" value={`${dbCpu}%`} detail="PgBouncer protected" tone={dbCpu < 75 ? "good" : "warn"} />
          <Metric icon={Network} label="Worker lag" value={`${workerLag}s`} detail="NATS consumer" tone={workerLag < 5 ? "good" : "warn"} />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Panel className="p-5">
          <div className="mb-5 flex items-center gap-2">
            <ServerCog className="h-5 w-5 text-[color:var(--brand)]" />
            <h2 className="font-display text-xl font-semibold">Bottleneck Checklist</h2>
          </div>
          <div className="grid gap-3">
            {bottlenecks.map((item) => (
              <div key={item.label} className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{item.detail}</p>
                  </div>
                  <Badge variant={item.status === "guarded" ? "success" : "default"}>{item.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-5 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-[color:var(--brand)]" />
            <h2 className="font-display text-xl font-semibold">Pass Criteria</h2>
          </div>
          <div className="space-y-4">
            <Criteria ok label="Receipt generated before grading" />
            <Criteria ok label="p95 receipt path below 800ms" />
            <Criteria ok={dbCpu < 75} label="DB CPU below 75% on spike" />
            <Criteria ok={workerLag < 5} label="Worker lag below 5 seconds" />
            <Criteria ok label="No synchronous ClickHouse / AI dependency" />
          </div>
          <div className="mt-6 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-[color:var(--success)]" /> Result</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
              Arsitektur lulus selama submit endpoint tetap hanya melakukan validasi ringan, idempotency check, insert inbox partition, dan return receipt.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof Timer; label: string; value: string; detail: string; tone: "good" | "warn" }) {
  return (
    <div className="border-b border-[color:var(--border)] p-5 md:border-b-0 md:border-r last:border-r-0">
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-[color:var(--muted-foreground)]">{label}</p>
        <div className={`rounded-2xl p-2 ${tone === "good" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{detail}</p>
    </div>
  );
}

function Criteria({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`rounded-full p-1 ${ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      </div>
      <p className="text-sm font-medium text-[color:var(--foreground)]">{label}</p>
    </div>
  );
}
