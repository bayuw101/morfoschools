import { describe, expect, it } from "vitest";
import { initialExams } from "../../exams/data";
import { calculateAnswerProgress, formatClock, getAutosaveState, getTimeWarning, updateAnswerState, validateSubmitReadiness } from "./take-exam-domain";

describe("take exam domain", () => {
  const questions = initialExams[0].questions;

  it("updates answer state immutably", () => {
    expect(updateAnswerState({ "q-1": "A" }, "q-2", "essay")).toEqual({ "q-1": "A", "q-2": "essay" });
    expect(updateAnswerState({ "q-1": "A" }, "q-1", "")).toEqual({});
  });

  it("calculates navigation completeness", () => {
    expect(calculateAnswerProgress(questions, { "q-1": "B" })).toEqual({ answered: 1, total: 2, progress: 50, unansweredIds: ["q-2"] });
  });

  it("maps autosave queue status and time remaining", () => {
    expect(getAutosaveState(false, true)).toEqual({ state: "queued", label: "Offline queue", tone: "warning" });
    expect(getAutosaveState(true, true)).toEqual({ state: "saving", label: "Saving", tone: "default" });
    expect(formatClock(125)).toBe("02:05");
    expect(getTimeWarning(599).tone).toBe("warning");
  });

  it("validates submit readiness", () => {
    expect(validateSubmitReadiness(questions, { "q-1": "B", "q-2": "essay" }, 10, false)).toEqual({ ready: true, reasons: [] });
    expect(validateSubmitReadiness(questions, { "q-1": "B" }, 0, true).reasons).toEqual(["Masih ada 1 soal belum dijawab", "Offline queue masih aktif", "Waktu ujian habis"]);
  });
});
