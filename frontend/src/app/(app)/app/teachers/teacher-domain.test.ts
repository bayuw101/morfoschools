import { describe, expect, it } from "vitest";
import { calculateTeacherMetrics, filterTeachers, mapUserToTeacher } from "./teacher-domain";

const users = [
  { id: "u1", name: "Bu Rina", email: "rina@example.sch.id", role: "teacher", status: "active" },
  { id: "u2", name: "Pak Dodi", email: "dodi@example.sch.id", role: "teacher", status: "invited" },
  { id: "u3", name: "Admin", email: "admin@example.sch.id", role: "admin", status: "active" },
] as const;

describe("teacher-domain", () => {
  it("maps only teacher users into teacher directory records", () => {
    expect(users.map(mapUserToTeacher).filter(Boolean)).toEqual([
      { id: "u1", name: "Bu Rina", email: "rina@example.sch.id", role: "teacher", status: "active", lastSeen: "—" },
      { id: "u2", name: "Pak Dodi", email: "dodi@example.sch.id", role: "teacher", status: "invited", lastSeen: "—" },
    ]);
  });

  it("filters teachers by name, email, and status", () => {
    const teachers = users.map(mapUserToTeacher).filter((teacher) => teacher !== null);
    expect(filterTeachers(teachers, "rina")).toHaveLength(1);
    expect(filterTeachers(teachers, "invited")[0]?.name).toBe("Pak Dodi");
  });

  it("calculates teacher directory metrics", () => {
    const teachers = users.map(mapUserToTeacher).filter((teacher) => teacher !== null);
    expect(calculateTeacherMetrics(teachers)).toEqual({ total: 2, active: 1, invited: 1, disabled: 0 });
  });
});
