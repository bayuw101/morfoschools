import { describe, expect, it } from "vitest";
import { mapApiSubjectGroup } from "./subject-group-api";

describe("subject group API mapping", () => {
  it("maps backend subject group payload to UI record without fake subject ids", () => {
    expect(mapApiSubjectGroup({
      id: "group-1",
      subjectId: "subject-1",
      subjectName: "Matematika",
      name: "Matematika Lintas Minat",
      academicYear: "2026/2027",
      term: "ganjil",
      status: "active",
      memberCount: 2,
    })).toEqual({
      id: "group-1",
      subjectId: "subject-1",
      subject: "Matematika",
      teacher: "Belum ditugaskan",
      name: "Matematika Lintas Minat",
      academicYear: "2026/2027",
      term: "ganjil",
      status: "active",
      studentIds: ["group-1-member-0", "group-1-member-1"],
    });
  });
});
