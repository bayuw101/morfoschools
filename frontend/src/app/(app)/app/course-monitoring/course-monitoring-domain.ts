export type CourseRisk = "low" | "medium" | "high";
export type StudentActivityStatus = "completed" | "watching" | "blocked" | "viewed";
export type BadgeTone = "success" | "default" | "warning" | "danger";

export type CourseHealthRecord = {
  title: string;
  audience: string;
  teacher: string;
  students: number;
  viewed: number;
  downloaded: number;
  completed: number;
  videoWatch: number;
  lastActivity: string;
  risk: CourseRisk;
};

export type StudentActivityRecord = {
  name: string;
  classSection: string;
  course: string;
  status: StudentActivityStatus;
  video: string;
  downloads: string;
  lastSeen: string;
};

export function calculateCourseMonitoringMetrics(courses: CourseHealthRecord[], trackedEvents: number) {
  const totalStudents = courses.reduce((sum, item) => sum + item.students, 0);
  const totalViewed = courses.reduce((sum, item) => sum + item.viewed, 0);
  const totalDownloaded = courses.reduce((sum, item) => sum + item.downloaded, 0);
  const totalCompleted = courses.reduce((sum, item) => sum + item.completed, 0);
  return {
    totalStudents,
    totalViewed,
    totalDownloaded,
    totalCompleted,
    viewRate: totalStudents === 0 ? 0 : Math.round((totalViewed / totalStudents) * 100),
    completionRate: totalStudents === 0 ? 0 : Math.round((totalCompleted / totalStudents) * 100),
    atRisk: courses.filter((item) => item.risk !== "low").length,
    trackedEvents,
  };
}

export function getCourseRiskAlert(risk: CourseRisk): { label: string; tone: BadgeTone } {
  if (risk === "low") return { label: "Healthy", tone: "success" };
  if (risk === "medium") return { label: "Needs follow-up", tone: "warning" };
  return { label: "At risk", tone: "danger" };
}

export function filterCourseHealth(courses: CourseHealthRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return courses;
  return courses.filter((course) => [course.title, course.audience, course.teacher, course.risk].join(" ").toLowerCase().includes(normalized));
}

export function filterStudentActivities(activities: StudentActivityRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return activities;
  return activities.filter((activity) => [activity.name, activity.classSection, activity.course, activity.status, activity.video, activity.downloads, activity.lastSeen].join(" ").toLowerCase().includes(normalized));
}
