export type MonitorEventType = "submit" | "violation" | "offline";
export type MonitorEvent = { id: string; student: string; type: MonitorEventType; detail: string };
export type BadgeTone = "success" | "warning" | "danger" | "default";

export function calculateMonitorMetrics(input: { active: number; offline: number; submitted: number; queue: number }) {
  return { ...input, totalObserved: input.active + input.offline + input.submitted };
}

export function getRiskAlert(input: { offline: number; violations: number }): { tone: BadgeTone; label: string } {
  if (input.offline >= 10 || input.violations >= 5) return { tone: "danger", label: "High risk" };
  if (input.offline > 0 || input.violations > 0) return { tone: "warning", label: "Watch" };
  return { tone: "success", label: "Stable" };
}

export function getQueueState(queue: number): { tone: BadgeTone; label: string } {
  if (queue === 0) return { tone: "success", label: "Clear" };
  if (queue >= 200) return { tone: "warning", label: "Backpressure" };
  return { tone: "default", label: "Processing" };
}

export function filterMonitorEvents(events: MonitorEvent[], status: MonitorEventType | "all", query: string) {
  const q = query.trim().toLowerCase();
  return events.filter((event) => (status === "all" || event.type === status) && (!q || `${event.student} ${event.detail}`.toLowerCase().includes(q)));
}
