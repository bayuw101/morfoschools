import { describe, expect, it } from "vitest";
import {
  calculateCourseMetrics,
  filterCourses,
  getCourseStatus,
  getModuleStorageLabel,
  type CourseDirectoryRecord,
  mapBackendCourseToDirectory,
  mapBackendModuleToCourseModule,
  mapModuleTypeToResource,
} from "./course-domain";


const courses: CourseDirectoryRecord[] = [
  { id: "course-algebra", courseOfferingId: "offering-algebra", title: "Aljabar Linear Dasar", subjectGroup: "Matematika X - Pagi", teacher: "Guru Matematika", description: "Dasar aljabar", status: "published", progress: 68, assignments: { subjectGroups: ["Matematika X - Pagi"], classSections: ["10-A"], students: ["Alya"] }, prerequisites: { courses: ["Bilangan"], exams: [] }, modules: [{ id: "m1", title: "Konsep Variabel", type: "youtube_upload", resourceUrl: "https://youtu.be/example", duration: "12 menit" }] },
  { id: "course-physics", courseOfferingId: "offering-physics", title: "Kinematika Olimpiade", subjectGroup: "Olimpiade Fisika", teacher: "Guru Fisika", description: "Gerak lurus", status: "draft", progress: 0, assignments: { subjectGroups: ["Olimpiade Fisika"], classSections: ["11-B", "12-C"], students: [] }, prerequisites: { courses: [], exams: ["Pretest"] }, modules: [] },
];

describe("course domain", () => {
  it("filters courses by title subject teacher class status and module title", () => {
    expect(filterCourses(courses, "aljabar").map((item) => item.id)).toEqual(["course-algebra"]);
    expect(filterCourses(courses, "guru fisika").map((item) => item.id)).toEqual(["course-physics"]);
    expect(filterCourses(courses, "11-b").map((item) => item.id)).toEqual(["course-physics"]);
    expect(filterCourses(courses, "konsep").map((item) => item.id)).toEqual(["course-algebra"]);
  });

  it("calculates course directory metrics", () => {
    expect(calculateCourseMetrics(courses)).toEqual({
      total: 2,
      published: 1,
      draft: 1,
      modules: 1,
      teacherAssignments: 2,
      audienceTargets: 6,
    });
  });

  it("maps course status labels and badge tones", () => {
    expect(getCourseStatus("published")).toEqual({ label: "Published", tone: "success" });
    expect(getCourseStatus("draft")).toEqual({ label: "Draft", tone: "default" });
  });

  it("maps external media storage labels without requiring external APIs", () => {
    expect(getModuleStorageLabel("youtube_upload")).toBe("YouTube metadata");
    expect(getModuleStorageLabel("drive_upload")).toBe("Google Drive metadata");
    expect(getModuleStorageLabel("article")).toBe("Internal article");
  });

  it("returns empty search state metadata when no course matches", async () => {
    const { getCourseEmptyState } = await import("./course-domain");
    expect(getCourseEmptyState("zzzz")).toEqual({
      title: "No courses found",
      description: "Tidak ada course yang cocok dengan \"zzzz\". Coba kata kunci subject, guru, kelas, status, atau module lain.",
    });
  });

  it("maps backend courses into the UI directory without mock fallback data", () => {
    const mapped = mapBackendCourseToDirectory(
      {
        id: "course-1",
        courseOfferingId: "offering-1",
        title: "Biologi X - Sel dan Jaringan",
        description: "Metadata-only course",
        status: "published",
        moduleCount: 1,
      },
      [{ id: "module-1", title: "Sel Hewan", type: "youtube_upload", duration: "Metadata only", resourceUrl: "https://youtu.be/example" }],
      [{ id: "offering-1", subjectName: "Biologi", className: "10-A" }],
      [{ courseOfferingId: "offering-1", teacherName: "Ibu Ratna Biologi", status: "active" }],
    );

    expect(mapped).toMatchObject({
      id: "course-1",
      subjectGroup: "Biologi - 10-A",
      teacher: "Ibu Ratna Biologi",
      assignments: { subjectGroups: ["Biologi - 10-A"], classSections: ["10-A"], students: [] },
      modules: [{ title: "Sel Hewan", type: "youtube_upload" }],
    });
  });

  it("maps backend module resources to low-spec metadata-only module cards", () => {
    expect(
      mapBackendModuleToCourseModule(
        { id: "module-1", courseId: "course-1", title: "Sel", position: 1, status: "published" },
        [{ id: "res-1", moduleId: "module-1", resourceType: "document", title: "LKPD Sel", externalUrl: "https://drive.google.com/file/d/example", provider: "google_drive", position: 1, status: "active" }],
      ),
    ).toEqual({
      id: "module-1",
      title: "LKPD Sel",
      type: "drive_upload",
      resourceUrl: "https://drive.google.com/file/d/example",
      duration: "Metadata only",
    });
    expect(mapModuleTypeToResource("external")).toEqual({ resourceType: "link", provider: "external" });
  });
});
