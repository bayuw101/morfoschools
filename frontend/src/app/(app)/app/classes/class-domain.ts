export type ClassStatus = "active" | "inactive";

export type ClassSectionRecord = {
  id: string;
  name: string;
  gradeLevel: string;
  academicYear: string;
  homeroomTeacher: string;
  status: ClassStatus;
  studentIds: string[];
};

export type StudentEnrollmentRecord = {
  id: string;
  nis: string;
  name: string;
  currentClassId?: string;
};

export type ClassMetrics = {
  total: number;
  active: number;
  inactive: number;
  enrolledStudents: number;
  unassignedStudents: number;
  averageClassSize: number;
};

export type ClassEmptyState = {
  title: string;
  description: string;
  actionLabel: string;
  canResetSearch: boolean;
};

export function getClassEmptyState(params: {
  totalClasses: number;
  query: string;
}): ClassEmptyState {
  const normalizedQuery = params.query.trim();

  if (params.totalClasses === 0) {
    return {
      title: "Belum ada class section",
      description: "Buat class section pertama agar enrollment siswa per tahun ajaran bisa mulai dikelola.",
      actionLabel: "Tambah Class Section",
      canResetSearch: false,
    };
  }

  return {
    title: "Tidak ada class section cocok",
    description: `Tidak ditemukan class section untuk "${normalizedQuery}". Coba nama kelas, wali kelas, tahun ajaran, grade, atau status lain.`,
    actionLabel: "Reset Search",
    canResetSearch: true,
  };
}

export function filterClasses(classes: ClassSectionRecord[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return classes;
  }

  return classes.filter((item) =>
    [
      item.name,
      item.gradeLevel,
      item.academicYear,
      item.homeroomTeacher,
      item.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export function filterStudentsForEnrollment(
  students: StudentEnrollmentRecord[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return students;
  }

  return students.filter((student) =>
    [student.name, student.nis]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export function calculateClassMetrics(
  classes: ClassSectionRecord[],
  students: StudentEnrollmentRecord[],
): ClassMetrics {
  const enrolledStudents = students.filter((item) => item.currentClassId).length;

  return {
    total: classes.length,
    active: classes.filter((item) => item.status === "active").length,
    inactive: classes.filter((item) => item.status === "inactive").length,
    enrolledStudents,
    unassignedStudents: students.length - enrolledStudents,
    averageClassSize: classes.length
      ? Math.round(enrolledStudents / classes.length)
      : 0,
  };
}

export function hasDuplicateClassSection(
  classes: ClassSectionRecord[],
  params: { name: string; academicYear: string; ignoreId?: string },
) {
  const normalizedName = params.name.trim().toLowerCase();

  return classes.some(
    (item) =>
      item.id !== params.ignoreId &&
      item.name.trim().toLowerCase() === normalizedName &&
      item.academicYear === params.academicYear,
  );
}
