import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { Users, BookOpen, Clock, CheckCircle } from "lucide-react";
import { calculateDashboardMetrics, orderOperationalAlerts, type DashboardActivity, type DashboardAlert } from "./dashboard-domain";

const dashboardActivities: DashboardActivity[] = [
  { id: "students-active", type: "student", count: 1240, active: true, minutesSpent: 0, passed: false },
  { id: "courses-active", type: "course", count: 24, active: true, minutesSpent: 0, passed: false },
  { id: "learn-a", type: "learning-session", count: 1, active: true, minutesSpent: 5400, passed: false },
  { id: "learn-b", type: "learning-session", count: 1, active: true, minutesSpent: 3960, passed: false },
  { id: "exam-pass-a", type: "exam-result", count: 1, active: true, minutesSpent: 0, passed: true },
  { id: "exam-pass-b", type: "exam-result", count: 1, active: true, minutesSpent: 0, passed: true },
  { id: "exam-pass-c", type: "exam-result", count: 1, active: true, minutesSpent: 0, passed: true },
];

const operationalAlerts: DashboardAlert[] = [
  { id: "course-upload", severity: "info", createdAt: "2026-05-03T08:00:00Z", title: "Materi Baru diunggah: Matematika Dasar" },
  { id: "exam-queue", severity: "warning", createdAt: "2026-05-03T09:00:00Z", title: "Exam inbox queue mendekati threshold" },
  { id: "backup", severity: "success", createdAt: "2026-05-03T07:00:00Z", title: "Backup tenant selesai" },
];

export default function DashboardPage() {
  const metrics = calculateDashboardMetrics(dashboardActivities);
  const alerts = orderOperationalAlerts(operationalAlerts);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-[color:var(--muted-foreground)]">Selamat datang di panel kontrol Morfosis LMS.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Total Murid" value={metrics.totalStudents.toLocaleString("id-ID")} detail="Terdaftar" icon={Users} />
        <MetricCard label="Kursus Aktif" value={String(metrics.activeCourses)} detail="Semester ini" icon={BookOpen} />
        <MetricCard label="Jam Belajar" value={String(metrics.learningHours)} detail="Minggu ini" icon={Clock} />
        <MetricCard label="Kelulusan" value={`${metrics.passRate}%`} detail="Target tercapai" icon={CheckCircle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2 p-6">
           <h3 className="text-lg font-display font-bold mb-4">Aktivitas Terbaru</h3>
           <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-4 py-3 border-b border-[color:var(--border)] last:border-0">
                   <div className="h-10 w-10 rounded-xl bg-[color:var(--brand-soft)] flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-[color:var(--brand-strong)]" />
                   </div>
                   <div className="flex-1">
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <p className="text-xs text-[color:var(--muted-foreground)]">{alert.severity}</p>
                   </div>
                </div>
              ))}
           </div>
        </Panel>
        
        <Panel className="p-6">
           <h3 className="text-lg font-display font-bold mb-4">Statistik Singkat</h3>
           <div className="flex items-center justify-center h-48">
              <p className="text-sm text-[color:var(--muted-foreground)] text-center">Chart placeholder ala Morfostocks</p>
           </div>
        </Panel>
      </div>
    </div>
  );
}
