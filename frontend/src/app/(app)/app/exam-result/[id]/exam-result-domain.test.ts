import { describe, expect, it } from "vitest";
import { initialExams } from "../../exams/data";
import { calculateMultipleChoiceScore, decodeAnswers, getFeedbackVisibility, getResultStatus, groupResultSections } from "./exam-result-domain";

describe("exam result domain", () => {
  const exam = initialExams[0];

  it("decodes encoded answers safely", () => {
    const encoded = btoa(encodeURIComponent(JSON.stringify({ "q-1": "B" })));
    expect(decodeAnswers(encoded)).toEqual({ "q-1": "B" });
    expect(decodeAnswers("bad-input")).toEqual({});
  });

  it("calculates multiple choice score summary", () => {
    expect(calculateMultipleChoiceScore(exam, { "q-1": "B" })).toEqual({ earned: 10, totalPoints: 30, percentage: 33 });
  });

  it("maps pass fail remedial status", () => {
    expect(getResultStatus(82, 75)).toEqual({ state: "passed", label: "Passed", tone: "success" });
    expect(getResultStatus(62, 75)).toEqual({ state: "remedial", label: "Remedial", tone: "warning" });
    expect(getResultStatus(30, 75)).toEqual({ state: "failed", label: "Failed", tone: "danger" });
  });

  it("groups result sections and feedback visibility", () => {
    expect(groupResultSections(exam.questions)).toEqual([{ type: "multiple_choice", count: 1, points: 10 }, { type: "essay", count: 1, points: 20 }]);
    expect(getFeedbackVisibility({ allAutoGradable: true, teacherAllowsInstantScore: true })).toEqual({ visible: true, reason: "Instant feedback enabled" });
    expect(getFeedbackVisibility({ allAutoGradable: false, teacherAllowsInstantScore: true }).visible).toBe(false);
  });
});
