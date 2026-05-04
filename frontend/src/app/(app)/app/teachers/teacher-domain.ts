export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "invited" | "active" | "disabled";
};

export type TeacherDirectoryItem = {
  id: string;
  name: string;
  email: string;
  role: "teacher";
  status: "invited" | "active" | "disabled";
  lastSeen: string;
};

export function mapUserToTeacher(user: ApiUser): TeacherDirectoryItem | null {
  if (user.role !== "teacher") return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: "teacher",
    status: user.status,
    lastSeen: "—",
  };
}

export function filterTeachers(teachers: TeacherDirectoryItem[], query: string): TeacherDirectoryItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return teachers;
  return teachers.filter((teacher) =>
    [teacher.name, teacher.email, teacher.status].some((value) => value.toLowerCase().includes(needle)),
  );
}

export function calculateTeacherMetrics(teachers: TeacherDirectoryItem[]) {
  return {
    total: teachers.length,
    active: teachers.filter((teacher) => teacher.status === "active").length,
    invited: teachers.filter((teacher) => teacher.status === "invited").length,
    disabled: teachers.filter((teacher) => teacher.status === "disabled").length,
  };
}
