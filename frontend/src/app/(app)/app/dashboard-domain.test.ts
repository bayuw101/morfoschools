import { describe, expect, it } from "vitest";
import {
  calculateDashboardMetrics,
  getVisibleQuickActions,
  orderOperationalAlerts,
  type DashboardActivity,
  type DashboardAlert,
  type DashboardQuickAction,
} from "./dashboard-domain";

const activities: DashboardActivity[] = [
  { id: "a1", type: "student", count: 1200, active: true, minutesSpent: 0, passed: false },
  { id: "a2", type: "student", count: 40, active: false, minutesSpent: 0, passed: false },
  { id: "a3", type: "course", count: 24, active: true, minutesSpent: 0, passed: false },
  { id: "a4", type: "learning-session", count: 1, active: true, minutesSpent: 5400, passed: false },
  { id: "a5", type: "learning-session", count: 1, active: true, minutesSpent: 3960, passed: false },
  { id: "a6", type: "exam-result", count: 1, active: true, minutesSpent: 0, passed: true },
  { id: "a7", type: "exam-result", count: 1, active: true, minutesSpent: 0, passed: false },
];

const quickActions: DashboardQuickAction[] = [
  { id: "tenant", label: "Kelola Tenant", href: "/app/tenants", roles: ["superadmin"] },
  { id: "exam", label: "Buat Ujian", href: "/app/exams", roles: ["teacher", "admin"] },
  { id: "learn", label: "Lanjut Belajar", href: "/app/learn", roles: ["student"] },
  { id: "gallery", label: "UI Gallery", href: "/app/gallery", roles: ["superadmin", "admin"] },
];

const alerts: DashboardAlert[] = [
  { id: "info", severity: "info", createdAt: "2026-05-03T08:00:00Z", title: "Info" },
  { id: "critical-old", severity: "critical", createdAt: "2026-05-03T07:00:00Z", title: "Critical Old" },
  { id: "warning-new", severity: "warning", createdAt: "2026-05-03T10:00:00Z", title: "Warning New" },
  { id: "critical-new", severity: "critical", createdAt: "2026-05-03T11:00:00Z", title: "Critical New" },
];

describe("dashboard domain helpers", () => {
  it("aggregates operational dashboard metrics", () => {
    expect(calculateDashboardMetrics(activities)).toEqual({
      totalStudents: 1240,
      activeCourses: 24,
      learningHours: 156,
      passRate: 50,
    });
  });

  it("shows quick actions matching the current role only", () => {
    expect(getVisibleQuickActions(quickActions, "teacher").map((action) => action.id)).toEqual(["exam"]);
    expect(getVisibleQuickActions(quickActions, "superadmin").map((action) => action.id)).toEqual(["tenant", "gallery"]);
  });

  it("orders operational alerts by severity first then newest timestamp", () => {
    expect(orderOperationalAlerts(alerts).map((alert) => alert.id)).toEqual([
      "critical-new",
      "critical-old",
      "warning-new",
      "info",
    ]);
  });
});
