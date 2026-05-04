import { describe, expect, it } from "vitest";
import { calculatePerformanceMetrics, compareClassPerformance, getRemedialGroups, type ScoreRecord } from "./exam-performance-domain";

const scores: ScoreRecord[] = [
  { student: "Budi", classSection: "10-A", score: 82 },
  { student: "Siti", classSection: "10-A", score: 48 },
  { student: "Andi", classSection: "10-B", score: 70 },
];

describe("exam performance domain", () => {
  it("calculates score summary and distribution", () => {
    expect(calculatePerformanceMetrics(scores)).toEqual({ average: 67, min: 48, max: 82, count: 3, distribution: { high: 1, medium: 1, low: 1 } });
  });

  it("detects remedial and at-risk students", () => {
    expect(getRemedialGroups(scores, 60)).toEqual([{ student: "Siti", classSection: "10-A", score: 48 }]);
  });

  it("compares class averages", () => {
    expect(compareClassPerformance(scores)).toEqual([
      { classSection: "10-B", average: 70, students: 1 },
      { classSection: "10-A", average: 65, students: 2 },
    ]);
  });
});
