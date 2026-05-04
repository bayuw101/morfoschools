import { describe, expect, it } from "vitest";
import {
  calculateUserMetrics,
  filterUsers,
  getDefaultUserFormValues,
  getRoleLabel,
  type UserDirectoryItem,
} from "./user-domain";

const users: UserDirectoryItem[] = [
  {
    id: "usr-admin-001",
    tenantId: "tenant-smp-morfosis",
    tenantName: "SMP Morfosis Demo",
    name: "Admin Sekolah",
    email: "admin@morfosis.local",
    role: "admin",
    status: "active",
    lastSeen: "Baru saja",
  },
  {
    id: "usr-guru-001",
    tenantId: "tenant-smp-morfosis",
    tenantName: "SMP Morfosis Demo",
    name: "Guru Matematika",
    email: "guru@morfosis.local",
    role: "teacher",
    status: "active",
    lastSeen: "5 menit lalu",
  },
  {
    id: "usr-siswa-001",
    tenantId: "tenant-sma-nusantara",
    tenantName: "SMA Nusantara 2",
    name: "Siswa Demo",
    email: "siswa@morfosis.local",
    role: "student",
    status: "invited",
    lastSeen: "Belum login",
  },
];

describe("filterUsers", () => {
  it("filters users by name, email, role label, and tenant case-insensitively", () => {
    expect(filterUsers(users, "matematika").map((user) => user.id)).toEqual([
      "usr-guru-001",
    ]);
    expect(filterUsers(users, "SISWA@MORFOSIS").map((user) => user.id)).toEqual([
      "usr-siswa-001",
    ]);
    expect(filterUsers(users, "guru").map((user) => user.id)).toEqual([
      "usr-guru-001",
    ]);
    expect(filterUsers(users, "nusantara").map((user) => user.id)).toEqual([
      "usr-siswa-001",
    ]);
  });

  it("returns all users for empty or whitespace query", () => {
    expect(filterUsers(users, "")).toHaveLength(3);
    expect(filterUsers(users, "   ")).toHaveLength(3);
  });
});

describe("calculateUserMetrics", () => {
  it("calculates total users, active users, invited users, and users per role", () => {
    expect(calculateUserMetrics(users)).toEqual({
      total: 3,
      active: 2,
      invited: 1,
      admins: 1,
      teachers: 1,
      students: 1,
      tenants: 2,
    });
  });
});

describe("getRoleLabel", () => {
  it("maps technical roles to Indonesian labels", () => {
    expect(getRoleLabel("admin")).toBe("Admin");
    expect(getRoleLabel("teacher")).toBe("Guru");
    expect(getRoleLabel("student")).toBe("Murid");
  });
});

describe("getDefaultUserFormValues", () => {
  it("uses first available tenant and teacher role for invite defaults", () => {
    expect(
      getDefaultUserFormValues([
        { label: "SMP Morfosis Demo", value: "tenant-smp-morfosis" },
        { label: "SMA Nusantara 2", value: "tenant-sma-nusantara" },
      ]),
    ).toEqual({
      name: "",
      email: "",
      tenantId: "tenant-smp-morfosis",
      role: "teacher",
    });
  });

  it("falls back to blank tenant when no tenant options are available", () => {
    expect(getDefaultUserFormValues([])).toEqual({
      name: "",
      email: "",
      tenantId: "",
      role: "teacher",
    });
  });
});
