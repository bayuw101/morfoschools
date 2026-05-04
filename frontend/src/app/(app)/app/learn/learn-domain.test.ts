import { describe, expect, it } from "vitest";
import {
  calculateLearningMetrics,
  filterLearningCourses,
  getNextRecommendedMaterial,
  getResourceDependency,
  type LearningCourseRecord,
} from "./learn-domain";

const courses: LearningCourseRecord[] = [
  { id: "course-algebra", title: "Aljabar Linear Dasar", teacher: "Guru Matematika", subjectGroup: "Matematika X - Pagi", progress: 68, status: "available", prerequisites: ["Placement selesai"], nextModule: "Latihan Persamaan", modules: [
    { id: "m1", title: "Konsep Variabel", type: "video", duration: "12 menit", progress: 100, resource: "YouTube metadata" },
    { id: "m2", title: "Latihan Persamaan", type: "document", duration: "20 menit", progress: 42, resource: "Google Drive PDF" },
  ] },
  { id: "course-physics", title: "Kinematika Olimpiade", teacher: "Guru Fisika", subjectGroup: "Olimpiade Fisika", progress: 18, status: "blocked", prerequisites: ["Pretest belum lulus"], nextModule: "GLBB", modules: [
    { id: "m3", title: "Gerak Lurus", type: "video", duration: "25 menit", progress: 18, resource: "YouTube metadata" },
  ] },
];

describe("learn domain", () => {
  it("filters learning courses by title teacher subject status and module", () => {
    expect(filterLearningCourses(courses, "fisika").map((item) => item.id)).toEqual(["course-physics"]);
    expect(filterLearningCourses(courses, "blocked").map((item) => item.id)).toEqual(["course-physics"]);
    expect(filterLearningCourses(courses, "latihan").map((item) => item.id)).toEqual(["course-algebra"]);
  });

  it("calculates learning metrics", () => {
    expect(calculateLearningMetrics(courses, 18)).toEqual({
      available: 1,
      completed: 0,
      blocked: 1,
      eventsToday: 18,
      averageProgress: 43,
    });
  });

  it("selects the first incomplete module as next recommended material", () => {
    expect(getNextRecommendedMaterial(courses[0])?.id).toBe("m2");
    expect(getNextRecommendedMaterial({ ...courses[0], modules: courses[0].modules.map((module) => ({ ...module, progress: 100 })) })?.id).toBe("m1");
  });

  it("keeps external media as metadata-only dependency outside critical path", () => {
    expect(getResourceDependency(courses[0].modules[0])).toEqual({ provider: "youtube", criticalPath: false, label: "YouTube metadata" });
    expect(getResourceDependency(courses[0].modules[1])).toEqual({ provider: "drive", criticalPath: false, label: "Google Drive PDF" });
  });
});
