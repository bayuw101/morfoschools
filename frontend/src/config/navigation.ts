import { Activity, BookOpen, Building2, CheckSquare, GraduationCap, Layers3, LayoutDashboard, LibraryBig, PenTool, School, Settings, ShieldCheck, UserRoundCheck, Users } from "lucide-react";
import { appRoutes } from "@/config/routes";

export const primaryNavigation = [
  { label: "Dashboard", href: appRoutes.appHome, icon: LayoutDashboard, permission: "dashboard:view" },
  { label: "Tenants", href: appRoutes.tenants, icon: Building2, permission: "tenants:manage" },
  { label: "Users", href: appRoutes.users, icon: ShieldCheck, permission: "users:manage" },
  { label: "Teachers", href: appRoutes.teachers, icon: UserRoundCheck, permission: "teachers:manage" },
  { label: "Classes", href: appRoutes.classes, icon: School, permission: "classes:manage" },
  { label: "Groups", href: appRoutes.subjectGroups, icon: Layers3, permission: "groups:manage" },
  { label: "Courses", href: appRoutes.courses, icon: BookOpen, permission: "courses:manage" },
  { label: "Monitor", href: appRoutes.courseMonitoring, icon: Activity, permission: "monitor:view" },
  { label: "Learn", href: appRoutes.learn, icon: LibraryBig, permission: "learn:view" },
  { label: "Exams", href: appRoutes.exams, icon: PenTool, permission: "exams:view" },
  { label: "Students", href: appRoutes.students, icon: Users, permission: "students:view" },
  { label: "Gallery", href: appRoutes.gallery, icon: GraduationCap, permission: "gallery:view" },
  { label: "Review", href: appRoutes.phaseOneReview, icon: CheckSquare, permission: "review:view" },
  { label: "Settings", href: appRoutes.settings, icon: Settings, permission: "settings:view" },
] as const;
