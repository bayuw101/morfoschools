import { listCoursesFromApi } from "../courses/course-api";
import type { CourseDirectoryRecord, CourseModuleRecord } from "../courses/course-domain";
import type { LearningCourseRecord, LearningModuleRecord, LearningModuleType } from "./learn-domain";

export function mapCourseModuleToLearningModule(module: CourseModuleRecord): LearningModuleRecord {
  return {
    id: module.id,
    title: module.title,
    type: mapModuleType(module.type),
    duration: module.duration,
    progress: 0,
    resource: mapResourceLabel(module),
  };
}

export function mapCourseToLearningCourse(course: CourseDirectoryRecord): LearningCourseRecord {
  const modules = course.modules.map(mapCourseModuleToLearningModule);
  const firstIncomplete = modules.find((module) => module.progress < 100) ?? modules[0];
  const missingPrerequisites = [
    ...course.prerequisites.courses.map((item) => `Course prerequisite belum selesai: ${item}`),
    ...course.prerequisites.exams.map((item) => `Exam prerequisite belum lulus: ${item}`),
  ];

  return {
    id: course.id,
    title: course.title,
    teacher: course.teacher,
    subjectGroup: course.subjectGroup,
    progress: course.progress,
    status: course.status === "published" && missingPrerequisites.length === 0 ? "available" : "blocked",
    prerequisites: missingPrerequisites,
    nextModule: firstIncomplete?.title ?? "Belum ada module",
    modules,
  };
}

export async function listLearningCourses(): Promise<LearningCourseRecord[]> {
  const courses = await listCoursesFromApi();
  return courses.map(mapCourseToLearningCourse);
}

function mapModuleType(type: CourseModuleRecord["type"]): LearningModuleType {
  if (type === "youtube_upload") return "video";
  if (type === "drive_upload") return "document";
  return "article";
}

function mapResourceLabel(module: CourseModuleRecord) {
  if (module.type === "youtube_upload") return "YouTube metadata";
  if (module.type === "drive_upload") return "Google Drive metadata";
  if (module.type === "external") return "External link metadata";
  return "Internal article";
}
