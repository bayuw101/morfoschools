export type CourseStatus = "draft" | "published";
export type ModuleType = "youtube_upload" | "drive_upload" | "external" | "article";
export type BadgeTone = "success" | "default" | "warning" | "danger";

export type CourseModuleRecord = {
  id: string;
  title: string;
  type: ModuleType;
  resourceUrl?: string;
  duration: string;
};

export type AssignmentTargetRecord = {
  subjectGroups: string[];
  classSections: string[];
  students: string[];
};

export type PrerequisiteTargetRecord = {
  courses: string[];
  exams: string[];
};

export type CourseDirectoryRecord = {
  id: string;
  title: string;
  subjectGroup: string;
  teacher: string;
  description: string;
  status: CourseStatus;
  progress: number;
  assignments: AssignmentTargetRecord;
  prerequisites: PrerequisiteTargetRecord;
  modules: CourseModuleRecord[];
};

export function filterCourses(courses: CourseDirectoryRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return courses;
  return courses.filter((course) =>
    [
      course.title,
      course.subjectGroup,
      course.teacher,
      course.description,
      course.status,
      ...course.assignments.subjectGroups,
      ...course.assignments.classSections,
      ...course.assignments.students,
      ...course.modules.map((module) => module.title),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function calculateCourseMetrics(courses: CourseDirectoryRecord[]) {
  return {
    total: courses.length,
    published: courses.filter((course) => course.status === "published").length,
    draft: courses.filter((course) => course.status === "draft").length,
    modules: courses.reduce((sum, course) => sum + course.modules.length, 0),
    teacherAssignments: new Set(courses.map((course) => course.teacher)).size,
    audienceTargets: courses.reduce(
      (sum, course) =>
        sum + course.assignments.subjectGroups.length + course.assignments.classSections.length + course.assignments.students.length,
      0,
    ),
  };
}

export function getCourseStatus(status: CourseStatus): { label: string; tone: BadgeTone } {
  if (status === "published") return { label: "Published", tone: "success" };
  return { label: "Draft", tone: "default" };
}

export function getModuleStorageLabel(type: ModuleType) {
  if (type === "youtube_upload") return "YouTube metadata";
  if (type === "drive_upload") return "Google Drive metadata";
  if (type === "external") return "External link metadata";
  return "Internal article";
}

export function getCourseEmptyState(query: string) {
  const normalized = query.trim();
  return {
    title: "No courses found",
    description: normalized
      ? `Tidak ada course yang cocok dengan "${normalized}". Coba kata kunci subject, guru, kelas, status, atau module lain.`
      : "Belum ada course. Tambahkan course pertama untuk mulai menyusun materi pembelajaran.",
  };
}
