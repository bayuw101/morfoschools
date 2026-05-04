import { describe, expect, it } from "vitest";
import { initialExams } from "./data";
import { calculateExamMetrics, filterExams, getExamStatus, getPublishReadiness } from "./exam-domain";

describe("exam domain", () => {
  it("filters exams by title subject class status and group", () => {
    expect(filterExams(initialExams, "10-a")).toHaveLength(1);
    expect(filterExams(initialExams, "fisika")[0]?.id).toBe("exam-physics-pretest");
    expect(filterExams(initialExams, "draft")[0]?.status).toBe("draft");
  });

  it("calculates exam directory metrics", () => {
    expect(calculateExamMetrics(initialExams)).toEqual({
      total: 2,
      draft: 1,
      scheduled: 1,
      published: 0,
      questions: 3,
      submissions: 0,
    });
  });

  it("maps exam status label and badge tone", () => {
    expect(getExamStatus("scheduled")).toEqual({ label: "Scheduled", tone: "warning" });
    expect(getExamStatus("published")).toEqual({ label: "Published", tone: "success" });
  });

  it("calculates publish readiness", () => {
    expect(getPublishReadiness(initialExams[0])).toEqual({ ready: true, blockers: [] });
    expect(getPublishReadiness({ ...initialExams[0], questions: [], gateRules: [] })).toEqual({
      ready: false,
      blockers: ["Tambahkan minimal 1 soal", "Tambahkan minimal 1 gate rule"],
    });
  });
});
