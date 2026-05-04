import type { Exam, Question } from "../../exams/data";

export type BadgeTone = "success" | "warning" | "danger" | "default";

export function decodeAnswers(encoded: string | null) {
  if (!encoded) return {} as Record<string, string>;
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as Record<string, string>;
  } catch {
    return {} as Record<string, string>;
  }
}

export function calculateMultipleChoiceScore(exam: Exam, answers: Record<string, string>) {
  const totalPoints = exam.questions.reduce((sum, question) => sum + Number(question.points || 0), 0);
  const earned = exam.questions.reduce((sum, question) => {
    if (question.type !== "multiple_choice") return sum;
    const selected = (answers[question.id] ?? "").split(",").filter(Boolean).sort();
    const correct = (question.correctOptionIds ?? (question.correctOptionId ? [question.correctOptionId] : [])).sort();
    const allCorrect = selected.length === correct.length && selected.every((item, index) => item === correct[index]);
    if (allCorrect) return sum + Number(question.points || 0);
    if (question.scoringMode === "partial" || question.scoringMode === "percentage") {
      const correctSelections = selected.filter((item) => correct.includes(item)).length;
      const wrongSelections = selected.filter((item) => !correct.includes(item)).length;
      const ratio = Math.max(0, (correctSelections - wrongSelections) / Math.max(correct.length, 1));
      return sum + Math.round(Number(question.points || 0) * ratio);
    }
    return sum;
  }, 0);
  return { earned, totalPoints, percentage: totalPoints ? Math.round((earned / totalPoints) * 100) : 0 };
}

export function getResultStatus(percentage: number, passingGrade: number): { state: "passed" | "remedial" | "failed"; label: string; tone: BadgeTone } {
  if (percentage >= passingGrade) return { state: "passed", label: "Passed", tone: "success" };
  if (percentage >= Math.max(0, passingGrade - 20)) return { state: "remedial", label: "Remedial", tone: "warning" };
  return { state: "failed", label: "Failed", tone: "danger" };
}

export function groupResultSections(questions: Question[]) {
  const grouped = new Map<Question["type"], { type: Question["type"]; count: number; points: number }>();
  for (const question of questions) {
    const current = grouped.get(question.type) ?? { type: question.type, count: 0, points: 0 };
    grouped.set(question.type, { ...current, count: current.count + 1, points: current.points + Number(question.points || 0) });
  }
  return Array.from(grouped.values());
}

export function getFeedbackVisibility(input: { allAutoGradable: boolean; teacherAllowsInstantScore: boolean }) {
  if (input.allAutoGradable && input.teacherAllowsInstantScore) return { visible: true, reason: "Instant feedback enabled" };
  if (!input.allAutoGradable) return { visible: false, reason: "Menunggu grading manual" };
  return { visible: false, reason: "Feedback disembunyikan guru" };
}
