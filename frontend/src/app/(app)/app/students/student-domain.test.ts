import { describe, expect, it } from "vitest";
import {
  calculateStudentMetrics,
  filterStudents,
  getStudentStatusLabel,
  type StudentDomainRecord,
} from "./student-domain";

const students: StudentDomainRecord[] = [
  {
    id: "std-1",
    nisn: "24001",
    name: "Budi Santoso",
    email: "budi@morfosis.local",
    classSection: "10-A",
    status: "active",
    risk: "normal",
  },
  {
    id: "std-2",
    nisn: "24002",
    name: "Siti Aminah",
    email: "siti@morfosis.local",
    classSection: "10-B",
    status: "inactive",
    risk: "attention",
  },
];

describe("student domain helpers", () => {
  it("filters students by name, NISN, email, or class section case-insensitively", () => {
    expect(filterStudents(students, "budi")).toHaveLength(1);
    expect(filterStudents(students, "24002")[0]?.name).toBe("Siti Aminah");
    expect(filterStudents(students, "10-a")[0]?.nisn).toBe("24001");
    expect(filterStudents(students, "MORFOSIS")).toHaveLength(2);
  });

  it("returns all students when query is blank or whitespace", () => {
    expect(filterStudents(students, "")).toHaveLength(2);
    expect(filterStudents(students, "   ")).toHaveLength(2);
  });

  it("normalizes whitespace inside query before matching", () => {
    expect(filterStudents(students, "  Budi    Santoso ").map((student) => student.id)).toEqual(["std-1"]);
  });

  it("calculates student metrics for dashboard cards including inactive edge cases", () => {
    const withGraduated: StudentDomainRecord[] = [
      ...students,
      { id: "std-3", nisn: "24003", name: "Rina Alumni", email: "rina@morfosis.local", classSection: "12-A", status: "graduated", risk: "normal" },
    ];

    expect(calculateStudentMetrics(withGraduated)).toEqual({
      total: 3,
      active: 1,
      attention: 1,
      classSections: 3,
    });
  });

  it("maps student status edge cases to user-facing labels", () => {
    expect(getStudentStatusLabel("active")).toEqual({ label: "Aktif", variant: "success" });
    expect(getStudentStatusLabel("inactive")).toEqual({ label: "Nonaktif", variant: "warning" });
    expect(getStudentStatusLabel("graduated")).toEqual({ label: "Lulus", variant: "shell" });
  });
});
