import { describe, expect, it } from "vitest";
import { canAccessPath, hasPermission, permissionForPath } from "./rbac";

describe("frontend RBAC policy", () => {
  it("allows only owner to manage tenants", () => {
    expect(hasPermission("owner", "tenants:manage")).toBe(true);
    expect(hasPermission("admin", "tenants:manage")).toBe(false);
    expect(hasPermission("teacher", "tenants:manage")).toBe(false);
    expect(hasPermission("student", "tenants:manage")).toBe(false);
  });

  it("allows admin but not teacher/student to manage users/classes/groups", () => {
    for (const permission of ["users:manage", "classes:manage", "groups:manage"] as const) {
      expect(hasPermission("owner", permission)).toBe(true);
      expect(hasPermission("admin", permission)).toBe(true);
      expect(hasPermission("teacher", permission)).toBe(false);
      expect(hasPermission("student", permission)).toBe(false);
    }
  });

  it("allows owner/admin/teacher but not student to manage courses", () => {
    expect(hasPermission("owner", "courses:manage")).toBe(true);
    expect(hasPermission("admin", "courses:manage")).toBe(true);
    expect(hasPermission("teacher", "courses:manage")).toBe(true);
    expect(hasPermission("student", "courses:manage")).toBe(false);
  });

  it("maps protected app paths to the most specific permission", () => {
    expect(permissionForPath("/app/tenants")).toBe("tenants:manage");
    expect(permissionForPath("/app/users/user-1")).toBe("users:manage");
    expect(permissionForPath("/app/classes")).toBe("classes:manage");
    expect(permissionForPath("/app/subject-groups/group-1")).toBe("groups:manage");
    expect(permissionForPath("/app/courses/course-1")).toBe("courses:manage");
  });

  it("blocks routes that the current role cannot access", () => {
    expect(canAccessPath("admin", "/app/tenants")).toBe(false);
    expect(canAccessPath("teacher", "/app/users")).toBe(false);
    expect(canAccessPath("student", "/app/classes")).toBe(false);
    expect(canAccessPath("admin", "/app/classes")).toBe(true);
  });
});
