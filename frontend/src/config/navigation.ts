import { Activity, BookOpen, Building2, CheckSquare, GraduationCap, Layers3, LayoutDashboard, LibraryBig, PenTool, School, Settings, ShieldCheck, Users } from "lucide-react";
import { appRoutes } from "@/config/routes";

export const primaryNavigation = [
  { label: "Dashboard", href: appRoutes.appHome, icon: LayoutDashboard },
  { label: "Tenants", href: appRoutes.tenants, icon: Building2 },
  { label: "Users", href: appRoutes.users, icon: ShieldCheck },
  { label: "Classes", href: appRoutes.classes, icon: School },
  { label: "Groups", href: appRoutes.subjectGroups, icon: Layers3 },
  { label: "Courses", href: appRoutes.courses, icon: BookOpen },
  { label: "Monitor", href: appRoutes.courseMonitoring, icon: Activity },
  { label: "Learn", href: appRoutes.learn, icon: LibraryBig },
  { label: "Exams", href: appRoutes.exams, icon: PenTool },
  { label: "Students", href: appRoutes.students, icon: Users },
  { label: "Gallery", href: appRoutes.gallery, icon: GraduationCap },
  { label: "Review", href: appRoutes.phaseOneReview, icon: CheckSquare },
  { label: "Settings", href: appRoutes.settings, icon: Settings },
] as const;
