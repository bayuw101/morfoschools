export type DashboardActivityType = "student" | "course" | "learning-session" | "exam-result";

export type DashboardActivity = {
  id: string;
  type: DashboardActivityType;
  count: number;
  active: boolean;
  minutesSpent: number;
  passed: boolean;
};

export type DashboardMetrics = {
  totalStudents: number;
  activeCourses: number;
  learningHours: number;
  passRate: number;
};

export type DashboardRole = "superadmin" | "admin" | "teacher" | "student";

export type DashboardQuickAction = {
  id: string;
  label: string;
  href: string;
  roles: DashboardRole[];
};

export type DashboardAlertSeverity = "critical" | "warning" | "info" | "success";

export type DashboardAlert = {
  id: string;
  severity: DashboardAlertSeverity;
  createdAt: string;
  title: string;
};

const alertSeverityWeight: Record<DashboardAlertSeverity, number> = {
  critical: 4,
  warning: 3,
  info: 2,
  success: 1,
};

export function calculateDashboardMetrics(activities: DashboardActivity[]): DashboardMetrics {
  const totalStudents = activities
    .filter((activity) => activity.type === "student")
    .reduce((sum, activity) => sum + activity.count, 0);

  const activeCourses = activities
    .filter((activity) => activity.type === "course" && activity.active)
    .reduce((sum, activity) => sum + activity.count, 0);

  const learningMinutes = activities
    .filter((activity) => activity.type === "learning-session")
    .reduce((sum, activity) => sum + activity.minutesSpent, 0);

  const examResults = activities.filter((activity) => activity.type === "exam-result");
  const passedResults = examResults.filter((activity) => activity.passed).length;

  return {
    totalStudents,
    activeCourses,
    learningHours: Math.round(learningMinutes / 60),
    passRate: examResults.length === 0 ? 0 : Math.round((passedResults / examResults.length) * 100),
  };
}

export function getVisibleQuickActions<T extends DashboardQuickAction>(actions: T[], role: DashboardRole): T[] {
  return actions.filter((action) => action.roles.includes(role));
}

export function orderOperationalAlerts<T extends DashboardAlert>(alerts: T[]): T[] {
  return [...alerts].sort((a, b) => {
    const severityDiff = alertSeverityWeight[b.severity] - alertSeverityWeight[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
