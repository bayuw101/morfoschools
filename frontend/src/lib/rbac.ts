import { appRoutes } from "../config/routes";

export const roles = ["owner", "admin", "teacher", "student"] as const;
export type AppRole = (typeof roles)[number];

export type Permission =
  | "dashboard:view"
  | "tenants:manage"
  | "users:manage"
  | "teachers:manage"
  | "classes:manage"
  | "groups:manage"
  | "courses:manage"
  | "monitor:view"
  | "learn:view"
  | "exams:view"
  | "students:view"
  | "gallery:view"
  | "review:view"
  | "settings:view";

const permissionsByRole: Record<AppRole, readonly Permission[]> = {
  owner: ["dashboard:view", "tenants:manage", "users:manage", "teachers:manage", "classes:manage", "groups:manage", "courses:manage", "monitor:view", "learn:view", "exams:view", "students:view", "gallery:view", "review:view", "settings:view"],
  admin: ["dashboard:view", "users:manage", "teachers:manage", "classes:manage", "groups:manage", "courses:manage", "monitor:view", "learn:view", "exams:view", "students:view", "gallery:view", "review:view", "settings:view"],
  teacher: ["dashboard:view", "courses:manage", "monitor:view", "learn:view", "exams:view", "students:view", "gallery:view"],
  student: ["dashboard:view", "learn:view", "exams:view", "gallery:view"],
};

export function normalizeRole(role: string | null | undefined): AppRole | null {
  if (!role) return null;
  return roles.includes(role as AppRole) ? (role as AppRole) : null;
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  return permissionsByRole[normalized].includes(permission);
}

export type RoutePolicy = {
  href: string;
  permission: Permission;
};

export const routePolicies: readonly RoutePolicy[] = [
  { href: appRoutes.tenants, permission: "tenants:manage" },
  { href: appRoutes.users, permission: "users:manage" },
  { href: appRoutes.teachers, permission: "teachers:manage" },
  { href: appRoutes.classes, permission: "classes:manage" },
  { href: appRoutes.subjectGroups, permission: "groups:manage" },
  { href: appRoutes.courses, permission: "courses:manage" },
  { href: appRoutes.courseMonitoring, permission: "monitor:view" },
  { href: appRoutes.learn, permission: "learn:view" },
  { href: appRoutes.exams, permission: "exams:view" },
  { href: appRoutes.students, permission: "students:view" },
  { href: appRoutes.gallery, permission: "gallery:view" },
  { href: appRoutes.phaseOneReview, permission: "review:view" },
  { href: appRoutes.settings, permission: "settings:view" },
  { href: appRoutes.appHome, permission: "dashboard:view" },
] as const;

export function permissionForPath(pathname: string): Permission | null {
  const match = [...routePolicies]
    .sort((a, b) => b.href.length - a.href.length)
    .find((policy) => policy.href === appRoutes.appHome ? pathname === policy.href : pathname.startsWith(policy.href));
  return match?.permission ?? null;
}

export function canAccessPath(role: string | null | undefined, pathname: string): boolean {
  const permission = permissionForPath(pathname);
  if (!permission) return true;
  return hasPermission(role, permission);
}
