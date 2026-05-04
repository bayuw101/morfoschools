import type { Question } from "../../exams/data";

export type BadgeTone = "success" | "warning" | "danger" | "default";
export type AutosaveState = "saved" | "saving" | "queued";

export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(totalSeconds % 60, 0);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function updateAnswerState(answers: Record<string, string>, questionId: string, value: string) {
  const next = { ...answers };
  if (!value.trim()) delete next[questionId];
  else next[questionId] = value;
  return next;
}

export function calculateAnswerProgress(questions: Question[], answers: Record<string, string>) {
  const unansweredIds = questions.filter((question) => !answers[question.id]?.trim()).map((question) => question.id);
  const answered = questions.length - unansweredIds.length;
  return { answered, total: questions.length, progress: Math.round((answered / Math.max(questions.length, 1)) * 100), unansweredIds };
}

export function getAutosaveState(isOnline: boolean, isDirty: boolean): { state: AutosaveState; label: string; tone: BadgeTone } {
  if (!isOnline) return { state: "queued", label: "Offline queue", tone: "warning" };
  if (isDirty) return { state: "saving", label: "Saving", tone: "default" };
  return { state: "saved", label: "Saved", tone: "success" };
}

export function getTimeWarning(secondsLeft: number): { tone: BadgeTone; label: string } {
  if (secondsLeft <= 0) return { tone: "danger", label: "Waktu habis" };
  if (secondsLeft < 10 * 60) return { tone: "warning", label: "Waktu hampir habis" };
  return { tone: "success", label: "Waktu aman" };
}

export function validateSubmitReadiness(questions: Question[], answers: Record<string, string>, secondsLeft: number, hasOfflineQueue: boolean) {
  const progress = calculateAnswerProgress(questions, answers);
  const reasons: string[] = [];
  if (progress.unansweredIds.length) reasons.push(`Masih ada ${progress.unansweredIds.length} soal belum dijawab`);
  if (hasOfflineQueue) reasons.push("Offline queue masih aktif");
  if (secondsLeft <= 0) reasons.push("Waktu ujian habis");
  return { ready: reasons.length === 0, reasons };
}
