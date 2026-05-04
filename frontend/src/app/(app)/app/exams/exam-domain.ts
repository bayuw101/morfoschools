import type { Exam, ExamForm } from "./data";

export type BadgeTone = "success" | "warning" | "danger" | "default";

export function filterExams(exams: Exam[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return exams;
  return exams.filter((exam) => {
    const searchable = [
      exam.title,
      exam.subject,
      exam.status,
      exam.duration,
      exam.rules,
      exam.securityMode,
      ...exam.targeting.subjectGroups,
      ...exam.targeting.classSections,
      ...exam.targeting.students,
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(normalized);
  });
}

export function calculateExamMetrics(exams: Exam[]) {
  return {
    total: exams.length,
    draft: exams.filter((exam) => exam.status === "draft").length,
    scheduled: exams.filter((exam) => exam.status === "scheduled").length,
    published: exams.filter((exam) => exam.status === "published").length,
    questions: exams.reduce((sum, exam) => sum + exam.questions.length, 0),
    submissions: exams.reduce((sum, exam) => sum + exam.submissions, 0),
  };
}

export function getExamStatus(status: ExamForm["status"]): { label: string; tone: BadgeTone } {
  if (status === "published") return { label: "Published", tone: "success" };
  if (status === "scheduled") return { label: "Scheduled", tone: "warning" };
  return { label: "Draft", tone: "default" };
}

export function getPublishReadiness(exam: Exam) {
  const blockers: string[] = [];
  if (exam.questions.length === 0) blockers.push("Tambahkan minimal 1 soal");
  if (exam.gateRules.length === 0) blockers.push("Tambahkan minimal 1 gate rule");
  if (
    exam.targeting.subjectGroups.length === 0 &&
    exam.targeting.classSections.length === 0 &&
    exam.targeting.students.length === 0
  ) {
    blockers.push("Pilih target peserta exam");
  }
  return { ready: blockers.length === 0, blockers };
}

export function getExamEmptyState(query: string) {
  const normalized = query.trim();
  return {
    title: "No exams found",
    description: normalized
      ? `Tidak ada exam yang cocok dengan "${normalized}". Coba cari judul, subject, kelas, group, atau status lain.`
      : "Belum ada exam. Buat exam pertama dengan target, gate, dan minimal satu soal sebelum publish.",
  };
}
