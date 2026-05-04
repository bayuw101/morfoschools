export type StudentDomainRecord = {
  id: string;
  nisn: string;
  name: string;
  email: string;
  classSection: string;
  status: "active" | "inactive" | "graduated";
  risk: "normal" | "attention";
};

export type StudentMetrics = {
  total: number;
  active: number;
  attention: number;
  classSections: number;
};

export type StudentStatusLabel = {
  label: string;
  variant: "success" | "warning" | "shell";
};

function normalizeStudentQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function filterStudents<T extends StudentDomainRecord>(students: T[], query: string): T[] {
  const normalizedQuery = normalizeStudentQuery(query);
  if (!normalizedQuery) return students;

  return students.filter((student) =>
    normalizeStudentQuery([student.name, student.nisn, student.email, student.classSection].join(" ")).includes(normalizedQuery),
  );
}

export function calculateStudentMetrics(students: StudentDomainRecord[]): StudentMetrics {
  return {
    total: students.length,
    active: students.filter((student) => student.status === "active").length,
    attention: students.filter((student) => student.risk === "attention").length,
    classSections: new Set(students.map((student) => student.classSection)).size,
  };
}

export function getStudentStatusLabel(status: StudentDomainRecord["status"]): StudentStatusLabel {
  const labels: Record<StudentDomainRecord["status"], StudentStatusLabel> = {
    active: { label: "Aktif", variant: "success" },
    inactive: { label: "Nonaktif", variant: "warning" },
    graduated: { label: "Lulus", variant: "shell" },
  };

  return labels[status];
}
