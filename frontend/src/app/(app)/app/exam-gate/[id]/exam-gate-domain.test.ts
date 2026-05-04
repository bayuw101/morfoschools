import { describe, expect, it } from "vitest";
import { initialExams } from "../../exams/data";
import { formatGateDateTime, getGateEligibilityState, validateGateAccess, validateScheduleWindow } from "./exam-gate-domain";

describe("exam gate domain", () => {
  const exam = initialExams[0];
  const gate = exam.gateRules[0];

  it("maps eligibility state from prerequisites and target membership", () => {
    expect(getGateEligibilityState({ inTarget: true, missingCourses: [], missingExams: [] })).toEqual({ eligible: true, label: "Eligible", blockers: [] });
    expect(getGateEligibilityState({ inTarget: false, missingCourses: ["Aljabar"], missingExams: [] })).toEqual({ eligible: false, label: "Blocked", blockers: ["Siswa tidak termasuk target exam", "Course belum completed: Aljabar"] });
  });

  it("validates password, accepted rules, eligibility, and schedule", () => {
    const validWindow = { state: "open" as const, label: "Open", tone: "success" as const };
    expect(validateGateAccess({ gate, password: "MATH-UTS", acceptedRules: true, eligibility: { eligible: true, label: "Eligible", blockers: [] }, schedule: validWindow })).toEqual({ canEnter: true, reasons: [] });
    expect(validateGateAccess({ gate, password: "wrong", acceptedRules: false, eligibility: { eligible: true, label: "Eligible", blockers: [] }, schedule: validWindow }).reasons).toEqual(["Rules belum disetujui", "Password gate salah"]);
  });

  it("validates schedule window states", () => {
    expect(validateScheduleWindow(gate, new Date("2026-05-06T08:30:00")).state).toBe("open");
    expect(validateScheduleWindow(gate, new Date("2026-05-06T07:30:00")).state).toBe("not_open");
    expect(validateScheduleWindow(gate, new Date("2026-05-06T10:30:00")).state).toBe("closed");
  });

  it("formats gate date time without external dependency", () => {
    expect(formatGateDateTime("")).toBe("Belum diatur");
    expect(formatGateDateTime("invalid-date")).toBe("invalid-date");
  });
});
