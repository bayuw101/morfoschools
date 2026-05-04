import { describe, expect, it } from "vitest";
import { calculateMonitorMetrics, filterMonitorEvents, getQueueState, getRiskAlert, type MonitorEvent } from "./exam-monitor-domain";

const events: MonitorEvent[] = [
  { id: "1", student: "Budi", type: "submit", detail: "ok" },
  { id: "2", student: "Siti", type: "violation", detail: "tab hidden" },
  { id: "3", student: "Andi", type: "offline", detail: "lost" },
];

describe("exam monitor domain", () => {
  it("calculates submission state metrics", () => {
    expect(calculateMonitorMetrics({ active: 142, offline: 3, submitted: 28, queue: 9 })).toEqual({ active: 142, offline: 3, submitted: 28, queue: 9, totalObserved: 173 });
  });

  it("maps risk and queue severity", () => {
    expect(getRiskAlert({ offline: 12, violations: 1 }).tone).toBe("danger");
    expect(getQueueState(0).label).toBe("Clear");
    expect(getQueueState(250).tone).toBe("warning");
  });

  it("filters monitor events by status and student", () => {
    expect(filterMonitorEvents(events, "violation", "siti")).toHaveLength(1);
    expect(filterMonitorEvents(events, "all", "")).toHaveLength(3);
  });
});
