import { describe, expect, it } from "vitest";
import {
  calculateBackendReadinessSummary,
  groupReviewSurfacesByFlow,
  validateReviewSurfaceCompleteness,
  type BackendReadinessItem,
  type ReviewFlow,
} from "./phase-review-domain";

const flows: ReviewFlow[] = [
  {
    id: "admin",
    title: "Admin foundation",
    role: "admin",
    status: "ready",
    surfaces: [
      { label: "Tenants", href: "/app/tenants", required: true },
      { label: "Users", href: "/app/users", required: true },
    ],
  },
  {
    id: "student",
    title: "Student exam",
    role: "student",
    status: "ready",
    surfaces: [
      { label: "Exam Gate", href: "/app/exam-gate/exam-mid-math-x", required: true },
      { label: "Result", href: "/app/exam-result/exam-mid-math-x", required: true },
    ],
  },
];

const readiness: BackendReadinessItem[] = [
  { id: "tenant", category: "data", label: "Tenant boundary", detail: "tenant_id policy", ready: true },
  { id: "inbox", category: "reliability", label: "Submission inbox", detail: "partitioned inbox", ready: true },
  { id: "audit", category: "operability", label: "Audit trail", detail: "events", ready: false },
];

describe("phase review domain helpers", () => {
  it("validates required review surfaces and reports missing hrefs", () => {
    expect(validateReviewSurfaceCompleteness(flows)).toEqual({ complete: true, missing: [] });

    expect(
      validateReviewSurfaceCompleteness([
        ...flows,
        { id: "broken", title: "Broken", role: "admin", status: "draft", surfaces: [{ label: "No Link", href: "", required: true }] },
      ]),
    ).toEqual({ complete: false, missing: ["Broken: No Link"] });
  });

  it("groups review surfaces by role/flow", () => {
    expect(groupReviewSurfacesByFlow(flows)).toEqual({
      admin: ["/app/tenants", "/app/users"],
      student: ["/app/exam-gate/exam-mid-math-x", "/app/exam-result/exam-mid-math-x"],
    });
  });

  it("summarizes backend readiness categories", () => {
    expect(calculateBackendReadinessSummary(readiness)).toEqual({
      total: 3,
      ready: 2,
      blocked: 1,
      categories: { data: 1, reliability: 1, operability: 1 },
    });
  });
});
