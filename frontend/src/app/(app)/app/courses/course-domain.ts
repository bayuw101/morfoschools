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
  courseOfferingId: string;
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


export type BackendCourse = {
  id: string;
  courseOfferingId: string;
  title: string;
  description: string;
  status: CourseStatus;
  moduleCount: number;
};

export type BackendCourseModule = {
  id: string;
  courseId: string;
  title: string;
  position: number;
  status: string;
};

export type BackendCourseResource = {
  id: string;
  moduleId: string;
  resourceType: string;
  title: string;
  externalUrl: string;
  provider: string;
  position: number;
  status: string;
};

export type BackendCourseOffering = {
  id: string;
  subjectName?: string;
  className?: string;
};

export type BackendTeachingAssignment = {
  courseOfferingId: string;
  teacherName?: string;
  status: string;
};

export function mapBackendCourseToDirectory(
  course: BackendCourse,
  modules: CourseModuleRecord[] = [],
  offerings: BackendCourseOffering[] = [],
  teachingAssignments: BackendTeachingAssignment[] = [],
): CourseDirectoryRecord {
  const offering = offerings.find((item) => item.id === course.courseOfferingId);
  const teachers = teachingAssignments
    .filter((item) => item.courseOfferingId === course.courseOfferingId && item.status !== "inactive")
    .map((item) => item.teacherName?.trim())
    .filter((item): item is string => Boolean(item));
  const subjectGroup = [offering?.subjectName, offering?.className].filter(Boolean).join(" - ");

  return {
    id: course.id,
    courseOfferingId: course.courseOfferingId,
    title: course.title,
    subjectGroup: subjectGroup || "Unassigned offering",
    teacher: teachers[0] || "Unassigned teacher",
    description: course.description,
    status: course.status,
    progress: 0,
    assignments: {
      subjectGroups: subjectGroup ? [subjectGroup] : [],
      classSections: offering?.className ? [offering.className] : [],
      students: [],
    },
    prerequisites: { courses: [], exams: [] },
    modules,
  };
}

export function mapBackendModuleToCourseModule(
  module: BackendCourseModule,
  resources: BackendCourseResource[] = [],
): CourseModuleRecord {
  const resource = resources.find((item) => item.moduleId === module.id);
  const type = mapResourceType(resource?.resourceType);
  return {
    id: module.id,
    title: resource?.title || module.title,
    type,
    resourceUrl: resource?.externalUrl || "",
    duration: "Metadata only",
  };
}

export function mapResourceType(resourceType?: string): ModuleType {
  if (resourceType === "video") return "youtube_upload";
  if (resourceType === "document") return "drive_upload";
  if (resourceType === "link") return "external";
  return "article";
}

export function mapModuleTypeToResource(type: ModuleType) {
  if (type === "youtube_upload") return { resourceType: "video", provider: "youtube" };
  if (type === "drive_upload") return { resourceType: "document", provider: "google_drive" };
  if (type === "external") return { resourceType: "link", provider: "external" };
  return { resourceType: "text", provider: "inline" };
}

export function mapCourseOfferingToOption(offering: BackendCourseOffering) {
  const label = [offering.subjectName, offering.className].filter(Boolean).join(" - ");
  return { label: label || offering.id, value: offering.id };
}
