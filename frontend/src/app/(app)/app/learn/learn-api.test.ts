import { describe, expect, it } from "vitest";
import { mapCourseModuleToLearningModule, mapCourseToLearningCourse } from "./learn-api";
import type { CourseDirectoryRecord, CourseModuleRecord } from "../courses/course-domain";

const baseModule: CourseModuleRecord = {
  id: "module-1",
  title: "Video Pembuka",
  type: "youtube_upload",
  duration: "Metadata only",
};

const baseCourse: CourseDirectoryRecord = {
  id: "course-1",
  courseOfferingId: "offering-1",
  title: "Matematika X",
  subjectGroup: "Matematika - X IPA",
  teacher: "Ibu Guru",
  description: "Course published",
  status: "published",
  progress: 0,
  assignments: { subjectGroups: ["Matematika - X IPA"], classSections: ["X IPA"], students: [] },
  prerequisites: { courses: [], exams: [] },
  modules: [baseModule],
};

describe("learn api mapper", () => {
  it("maps course modules to metadata-only learning modules", () => {
    expect(mapCourseModuleToLearningModule(baseModule)).toEqual({
      id: "module-1",
      title: "Video Pembuka",
      type: "video",
      duration: "Metadata only",
      progress: 0,
      resource: "YouTube metadata",
    });

    expect(mapCourseModuleToLearningModule({ ...baseModule, type: "drive_upload" }).resource).toBe("Google Drive metadata");
    expect(mapCourseModuleToLearningModule({ ...baseModule, type: "external" }).type).toBe("article");
  });

  it("marks published courses without prerequisites as available", () => {
    expect(mapCourseToLearningCourse(baseCourse)).toMatchObject({
      id: "course-1",
      status: "available",
      nextModule: "Video Pembuka",
      prerequisites: [],
    });
  });

  it("blocks draft courses or courses with unmet prerequisites", () => {
    expect(mapCourseToLearningCourse({ ...baseCourse, status: "draft" }).status).toBe("blocked");
    expect(
      mapCourseToLearningCourse({
        ...baseCourse,
        prerequisites: { courses: ["Aljabar Dasar"], exams: ["Pretest X"] },
      }),
    ).toMatchObject({
      status: "blocked",
      prerequisites: [
        "Course prerequisite belum selesai: Aljabar Dasar",
        "Exam prerequisite belum lulus: Pretest X",
      ],
    });
  });
});
