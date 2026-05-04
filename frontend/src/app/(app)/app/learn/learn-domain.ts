export type LearningCourseStatus = "available" | "blocked";
export type LearningModuleType = "video" | "document" | "article";

export type LearningModuleRecord = {
  id: string;
  title: string;
  type: LearningModuleType;
  duration: string;
  progress: number;
  resource: string;
};

export type LearningCourseRecord = {
  id: string;
  title: string;
  teacher: string;
  subjectGroup: string;
  progress: number;
  status: LearningCourseStatus;
  prerequisites: string[];
  nextModule: string;
  modules: LearningModuleRecord[];
};

export function filterLearningCourses(courses: LearningCourseRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return courses;
  return courses.filter((course) =>
    [course.title, course.teacher, course.subjectGroup, course.status, course.nextModule, ...course.prerequisites, ...course.modules.map((module) => `${module.title} ${module.type} ${module.resource}`)]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function calculateLearningMetrics(courses: LearningCourseRecord[], eventsToday: number) {
  return {
    available: courses.filter((course) => course.status === "available").length,
    completed: courses.filter((course) => course.progress >= 100).length,
    blocked: courses.filter((course) => course.status === "blocked").length,
    eventsToday,
    averageProgress: courses.length === 0 ? 0 : Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length),
  };
}

export function getNextRecommendedMaterial(course: LearningCourseRecord) {
  return course.modules.find((module) => module.progress < 100) ?? course.modules[0] ?? null;
}

export function getResourceDependency(module: LearningModuleRecord) {
  const resource = module.resource.toLowerCase();
  if (module.type === "video" || resource.includes("youtube")) return { provider: "youtube", criticalPath: false, label: module.resource };
  if (module.type === "document" || resource.includes("drive")) return { provider: "drive", criticalPath: false, label: module.resource };
  return { provider: "internal", criticalPath: false, label: module.resource };
}
