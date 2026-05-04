import { describe, expect, it } from "vitest";
import {
  buildTeacherOptions,
  calculateClassMetrics,
  filterClasses,
  filterStudentsForEnrollment,
  getClassEmptyState,
  hasDuplicateClassSection,
  type ClassSectionRecord,
  type StudentEnrollmentRecord,
} from "./class-domain";

const classes: ClassSectionRecord[] = [
  { id: "cls-10a", name: "10-A", gradeLevel: "10", academicYear: "2025/2026", homeroomTeacher: "Bu Rani Wulandari", status: "active", studentIds: ["std-001", "std-002"] },
  { id: "cls-11b", name: "11-B", gradeLevel: "11", academicYear: "2025/2026", homeroomTeacher: "Pak Arif Setiawan", status: "active", studentIds: ["std-003"] },
  { id: "cls-12c", name: "12-C", gradeLevel: "12", academicYear: "2024/2025", homeroomTeacher: "Bu Maya Kartika", status: "inactive", studentIds: [] },
];

const students: StudentEnrollmentRecord[] = [
  { id: "std-001", nis: "2025001", name: "Alya Putri", currentClassId: "cls-10a" },
  { id: "std-002", nis: "2025002", name: "Bima Prakoso", currentClassId: "cls-10a" },
  { id: "std-003", nis: "2025003", name: "Citra Maharani", currentClassId: "cls-11b" },
  { id: "std-004", nis: "2025004", name: "Daffa Ramadhan" },
];

describe("filterClasses", () => {
  it("filters class sections by name, grade, academic year, homeroom teacher, and status", () => {
    expect(filterClasses(classes, "10-a").map((item) => item.id)).toEqual(["cls-10a"]);
    expect(filterClasses(classes, "arif").map((item) => item.id)).toEqual(["cls-11b"]);
    expect(filterClasses(classes, "2024/2025").map((item) => item.id)).toEqual(["cls-12c"]);
    expect(filterClasses(classes, "inactive").map((item) => item.id)).toEqual(["cls-12c"]);
  });

  it("returns all class sections for empty or whitespace query", () => {
    expect(filterClasses(classes, "")).toHaveLength(3);
    expect(filterClasses(classes, "   ")).toHaveLength(3);
  });
});

describe("getClassEmptyState", () => {
  it("returns setup copy when there are no class sections yet", () => {
    expect(getClassEmptyState({ totalClasses: 0, query: "" })).toEqual({
      title: "Belum ada class section",
      description: "Buat class section pertama agar enrollment siswa per tahun ajaran bisa mulai dikelola.",
      actionLabel: "Tambah Class Section",
      canResetSearch: false,
    });
  });

  it("returns search no-result copy for a non-empty query", () => {
    expect(getClassEmptyState({ totalClasses: 3, query: "  ipa 99  " })).toEqual({
      title: "Tidak ada class section cocok",
      description: "Tidak ditemukan class section untuk \"ipa 99\". Coba nama kelas, wali kelas, tahun ajaran, grade, atau status lain.",
      actionLabel: "Reset Search",
      canResetSearch: true,
    });
  });
});

describe("calculateClassMetrics", () => {
  it("calculates active classes, enrolled students, total capacity evidence, and average class size", () => {
    expect(calculateClassMetrics(classes, students)).toEqual({
      total: 3,
      active: 2,
      inactive: 1,
      enrolledStudents: 3,
      unassignedStudents: 1,
      averageClassSize: 1,
    });
  });
});

describe("filterStudentsForEnrollment", () => {
  it("filters enrollment candidates by name or NIS", () => {
    expect(filterStudentsForEnrollment(students, "citra").map((item) => item.id)).toEqual(["std-003"]);
    expect(filterStudentsForEnrollment(students, "2025004").map((item) => item.id)).toEqual(["std-004"]);
  });
});

describe("hasDuplicateClassSection", () => {
  it("detects duplicate class name within the same academic year while ignoring the edited record", () => {
    expect(hasDuplicateClassSection(classes, { name: "10-a", academicYear: "2025/2026" })).toBe(true);
    expect(hasDuplicateClassSection(classes, { name: "10-a", academicYear: "2025/2026", ignoreId: "cls-10a" })).toBe(false);
    expect(hasDuplicateClassSection(classes, { name: "10-a", academicYear: "2024/2025" })).toBe(false);
  });
});


describe("buildTeacherOptions", () => {
  it("includes backend homeroom teachers so edit select can display persisted values", () => {
    expect(
      buildTeacherOptions(classes, ["Bu Rani Wulandari", "Pak Dimas Nugroho"]).map((option) => option.value),
    ).toEqual(["Bu Rani Wulandari", "Pak Dimas Nugroho", "Pak Arif Setiawan", "Bu Maya Kartika"]);
  });

  it("deduplicates blank and repeated teacher names", () => {
    expect(
      buildTeacherOptions(
        [
          ...classes,
          { id: "cls-empty", name: "10-Z", gradeLevel: "10", academicYear: "2025/2026", homeroomTeacher: " ", status: "active", studentIds: [] },
          { id: "cls-repeat", name: "10-Y", gradeLevel: "10", academicYear: "2025/2026", homeroomTeacher: "Bu Rani Wulandari", status: "active", studentIds: [] },
        ],
        ["Bu Rani Wulandari"],
      ).filter((option) => option.value === "Bu Rani Wulandari"),
    ).toHaveLength(1);
  });
});
