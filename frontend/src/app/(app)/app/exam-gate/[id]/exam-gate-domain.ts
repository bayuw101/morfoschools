import type { GateRule } from "../../exams/data";

export type BadgeTone = "success" | "warning" | "danger" | "default";
export type GateScheduleState = { state: "open" | "not_open" | "closed" | "unscheduled"; label: string; tone: BadgeTone };
export type GateEligibilityState = { eligible: boolean; label: "Eligible" | "Blocked"; blockers: string[] };

export function formatGateDateTime(value?: string) {
  if (!value) return "Belum diatur";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function getGateEligibilityState(input: { inTarget: boolean; missingCourses: string[]; missingExams: string[] }): GateEligibilityState {
  const blockers = [
    ...(input.inTarget ? [] : ["Siswa tidak termasuk target exam"]),
    ...input.missingCourses.map((item) => `Course belum completed: ${item}`),
    ...input.missingExams.map((item) => `Exam belum lulus/selesai: ${item}`),
  ];
  return { eligible: blockers.length === 0, label: blockers.length === 0 ? "Eligible" : "Blocked", blockers };
}

export function validateScheduleWindow(gate: GateRule | undefined, now = new Date()): GateScheduleState {
  if (!gate?.openAt || !gate.closeAt) return { state: "unscheduled", label: "Schedule belum lengkap", tone: "warning" };
  const openAt = new Date(gate.openAt);
  const closeAt = new Date(gate.closeAt);
  if (Number.isNaN(openAt.getTime()) || Number.isNaN(closeAt.getTime())) return { state: "unscheduled", label: "Schedule invalid", tone: "danger" };
  if (now < openAt) return { state: "not_open", label: "Belum open", tone: "warning" };
  if (now > closeAt) return { state: "closed", label: "Closed", tone: "danger" };
  return { state: "open", label: "Open", tone: "success" };
}

export function validateGateAccess(input: { gate: GateRule | undefined; password: string; acceptedRules: boolean; eligibility: GateEligibilityState; schedule: GateScheduleState }) {
  const reasons = [...input.eligibility.blockers];
  if (!input.acceptedRules) reasons.push("Rules belum disetujui");
  if (input.gate?.passwordEnabled && input.password.trim() !== input.gate.password) reasons.push("Password gate salah");
  if (input.schedule.state !== "open") reasons.push(input.schedule.label);
  return { canEnter: reasons.length === 0, reasons };
}
