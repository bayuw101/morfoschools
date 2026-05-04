import { describe, expect, it } from "vitest";
import { calculateFinalScore, calculateGradingMetrics, filterSubmissionsForGrading, validateEssayScore, type GradingSubmission } from "./exam-grading-domain";

const submissions: GradingSubmission[] = [
  { id: "1", student: "Budi", status: "needs_grading", mcScore: 10, essayScore: null, maxScore: 30, violations: 0 },
  { id: "2", student: "Siti", status: "partial", mcScore: 10, essayScore: 14, maxScore: 30, violations: 2 },
  { id: "3", student: "John", status: "completed", mcScore: 10, essayScore: 18, maxScore: 30, violations: 0 },
];

describe("exam grading domain", () => {
  it("validates rubric essay score boundaries", () => {
    expect(validateEssayScore("25", 20)).toEqual({ valid: false, normalized: 20, error: "Score maksimal 20" });
    expect(validateEssayScore("12", 20)).toEqual({ valid: true, normalized: 12, error: null });
  });

  it("calculates pending/manual grading counts", () => {
    expect(calculateGradingMetrics(submissions)).toEqual({ needsGrading: 2, completed: 1, averageScore: 26, readyToPublish: false });
  });

  it("calculates final score and filters queue", () => {
    expect(calculateFinalScore({ mcScore: 10, essayScore: 14 })).toBe(24);
    expect(filterSubmissionsForGrading(submissions, "completed", "john")).toHaveLength(1);
  });
});
