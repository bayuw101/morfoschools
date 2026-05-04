import { describe, expect, it } from "vitest";
import { initialExams } from "../data";
import { calculateExamBuilderMetrics, getExamGateSummary, validateExamPublish } from "./exam-detail-domain";

describe("exam detail domain", () => {
  const exam = initialExams[0];

  it("calculates question counts and total points", () => {
    expect(calculateExamBuilderMetrics(exam)).toEqual({ questions: 2, totalPoints: 30, gateRules: 1, eligibleTargets: 2 });
  });

  it("validates publish blockers", () => {
    expect(validateExamPublish({ ...exam, questions: [] }).blockers).toContain("Tambahkan minimal 1 soal");
    expect(validateExamPublish({ ...exam, targeting: { subjectGroups: [], classSections: [], students: [] } }).blockers).toContain("Pilih target peserta exam");
  });

  it("summarizes exam gate rules", () => {
    expect(getExamGateSummary(exam.gateRules[0])).toContain("class: 10-A, 10-B");
    expect(getExamGateSummary(exam.gateRules[0])).toContain("password enabled");
  });
});
