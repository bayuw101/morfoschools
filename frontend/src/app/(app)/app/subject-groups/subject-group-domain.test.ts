import { describe, expect, it } from "vitest";
import {
  calculateSubjectGroupMetrics,
  filterSubjectGroups,
  filterSubjectGroupStudents,
  hasDuplicateSubjectGroup,
  type SubjectGroupRecord,
  type SubjectGroupStudentRecord,
} from "./subject-group-domain";

const groups: SubjectGroupRecord[] = [
  { id: "sg-math", name: "Matematika X - Pagi", subject: "Matematika", teacher: "Guru Matematika", academicYear: "2025/2026", status: "active", studentIds: ["std-1", "std-2", "std-3"] },
  { id: "sg-physics", name: "Olimpiade Fisika", subject: "Fisika", teacher: "Guru Fisika", academicYear: "2025/2026", status: "active", studentIds: ["std-4"] },
  { id: "sg-bahasa", name: "Bahasa Indonesia Remedial", subject: "Bahasa Indonesia", teacher: "Guru Bahasa", academicYear: "2025/2026", status: "draft", studentIds: [] },
];

const students: SubjectGroupStudentRecord[] = [
  { id: "std-1", nis: "2025001", name: "Alya Putri", classSection: "10-A" },
  { id: "std-2", nis: "2025002", name: "Bima Prakoso", classSection: "10-A" },
  { id: "std-4", nis: "2025004", name: "Daffa Ramadhan", classSection: "11-B" },
];

describe("subject group domain", () => {
  it("filters subject groups by name subject teacher year and status", () => {
    expect(filterSubjectGroups(groups, "fisika").map((item) => item.id)).toEqual(["sg-physics"]);
    expect(filterSubjectGroups(groups, "guru bahasa").map((item) => item.id)).toEqual(["sg-bahasa"]);
    expect(filterSubjectGroups(groups, "draft").map((item) => item.id)).toEqual(["sg-bahasa"]);
  });

  it("calculates subject group metrics", () => {
    expect(calculateSubjectGroupMetrics(groups)).toEqual({
      total: 3,
      active: 2,
      draft: 1,
      subjects: 3,
      students: 4,
      averageSize: 1,
    });
  });

  it("detects duplicate subject group name within academic year", () => {
    expect(hasDuplicateSubjectGroup(groups, { name: "matematika x - pagi", academicYear: "2025/2026" })).toBe(true);
    expect(hasDuplicateSubjectGroup(groups, { name: "Matematika X - Pagi", academicYear: "2025/2026", ignoreId: "sg-math" })).toBe(false);
  });

  it("filters available member students by search and class", () => {
    expect(filterSubjectGroupStudents(students, { query: "alya", classSection: "all" }).map((item) => item.id)).toEqual(["std-1"]);
    expect(filterSubjectGroupStudents(students, { query: "", classSection: "10-A" }).map((item) => item.id)).toEqual(["std-1", "std-2"]);
  });
});
