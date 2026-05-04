export type SubjectGroupStatus = "active" | "draft";

export type SubjectGroupStudentRecord = {
  id: string;
  nis: string;
  name: string;
  classSection: string;
};

export type SubjectGroupRecord = {
  id: string;
  name: string;
  subjectId: string;
  subject: string;
  teacher: string;
  academicYear: string;
  term: string;
  status: SubjectGroupStatus;
  studentIds: string[];
};

export function filterSubjectGroups(groups: SubjectGroupRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return groups;
  return groups.filter((group) =>
    [group.name, group.subject, group.teacher, group.academicYear, group.status]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function calculateSubjectGroupMetrics(groups: SubjectGroupRecord[]) {
  const total = groups.length;
  const active = groups.filter((group) => group.status === "active").length;
  const students = groups.reduce((sum, group) => sum + group.studentIds.length, 0);
  return {
    total,
    active,
    draft: groups.filter((group) => group.status === "draft").length,
    subjects: new Set(groups.map((group) => group.subject)).size,
    students,
    averageSize: total === 0 ? 0 : Math.round(students / total),
  };
}

export function hasDuplicateSubjectGroup(
  groups: SubjectGroupRecord[],
  input: { name: string; academicYear: string; ignoreId?: string },
) {
  const name = input.name.trim().toLowerCase();
  return groups.some(
    (group) =>
      group.id !== input.ignoreId &&
      group.name.trim().toLowerCase() === name &&
      group.academicYear === input.academicYear,
  );
}

export function filterSubjectGroupStudents(
  students: SubjectGroupStudentRecord[],
  filter: { query: string; classSection: string },
) {
  const query = filter.query.trim().toLowerCase();
  return students.filter((student) => {
    const matchesQuery = !query || [student.name, student.nis, student.classSection].join(" ").toLowerCase().includes(query);
    const matchesClass = filter.classSection === "all" || student.classSection === filter.classSection;
    return matchesQuery && matchesClass;
  });
}
