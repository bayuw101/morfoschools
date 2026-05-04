import type { Exam, GateRule } from "../data";

export function calculateExamBuilderMetrics(exam: Exam) {
  return {
    questions: exam.questions.length,
    totalPoints: exam.questions.reduce((sum, q) => sum + Number(q.points || 0), 0),
    gateRules: exam.gateRules.length,
    eligibleTargets: exam.targeting.subjectGroups.length + exam.targeting.classSections.length + exam.targeting.students.length,
  };
}

export function validateExamPublish(exam: Exam) {
  const blockers: string[] = [];
  if (exam.questions.length === 0) blockers.push("Tambahkan minimal 1 soal");
  if (exam.targeting.subjectGroups.length + exam.targeting.classSections.length + exam.targeting.students.length === 0) blockers.push("Pilih target peserta exam");
  if (exam.gateRules.length === 0) blockers.push("Tambahkan gate rule jadwal");
  return { ready: blockers.length === 0, blockers };
}

export function getExamGateSummary(rule: GateRule) {
  const targets = rule.targets.length ? rule.targets.join(", ") : "all assigned targets";
  const password = rule.passwordEnabled ? "password enabled" : "no password";
  return `${rule.scope}: ${targets} • ${password} • ${rule.openAt || "no open time"} - ${rule.closeAt || "no close time"}`;
}
