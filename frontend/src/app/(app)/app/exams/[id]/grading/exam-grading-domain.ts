export type GradingStatus = "needs_grading" | "partial" | "completed";
export type GradingSubmission = { id: string; student: string; status: GradingStatus; mcScore: number; essayScore: number | null; maxScore: number; violations: number };

export function validateEssayScore(raw: string, maxScore: number) {
  const parsed = Number(raw || 0);
  const normalized = Math.max(0, Math.min(parsed, maxScore));
  if (parsed > maxScore) return { valid: false, normalized, error: `Score maksimal ${maxScore}` };
  if (parsed < 0 || Number.isNaN(parsed)) return { valid: false, normalized: 0, error: "Score tidak valid" };
  return { valid: true, normalized, error: null };
}

export function calculateFinalScore(input: { mcScore: number; essayScore: number | null }) {
  return input.mcScore + (input.essayScore ?? 0);
}

export function calculateGradingMetrics(submissions: GradingSubmission[]) {
  const completedRows = submissions.filter((item) => item.essayScore !== null);
  return {
    needsGrading: submissions.filter((item) => item.status !== "completed").length,
    completed: submissions.filter((item) => item.status === "completed").length,
    averageScore: Math.round(completedRows.reduce((sum, item) => sum + calculateFinalScore(item), 0) / Math.max(completedRows.length, 1)),
    readyToPublish: submissions.every((item) => item.status === "completed"),
  };
}

export function filterSubmissionsForGrading(submissions: GradingSubmission[], filter: GradingStatus | "all", query: string) {
  const q = query.trim().toLowerCase();
  return submissions.filter((item) => (filter === "all" || item.status === filter) && (!q || item.student.toLowerCase().includes(q)));
}
