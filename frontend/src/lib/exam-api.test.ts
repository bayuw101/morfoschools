import { describe, expect, it, vi } from "vitest";
import {
  buildExamApiHeaders,
  createExamApiClient,
  encodeSubmissionAnswers,
  resolveExamRuntimeIds,
  type ExamAnswerState,
} from "./exam-api";

describe("exam backend api client", () => {
  it("builds tenant and dev identity headers without leaking blank values", () => {
    expect(
      buildExamApiHeaders({
        tenantId: " tenant-1 ",
        userId: " teacher-1 ",
        userRole: "teacher",
        gateToken: " token-1 ",
      }),
    ).toEqual({
      "Content-Type": "application/json",
      "X-Tenant-ID": "tenant-1",
      "X-User-ID": "teacher-1",
      "X-User-Role": "teacher",
      "X-Exam-Gate-Token": "token-1",
    });

    expect(buildExamApiHeaders({ tenantId: "tenant-1", userId: "", userRole: "" })).toEqual({
      "Content-Type": "application/json",
      "X-Tenant-ID": "tenant-1",
    });
  });

  it("resolves runtime ids from live session/overrides and refuses demo tenant fallbacks", () => {
    expect(() => resolveExamRuntimeIds("exam-1")).toThrow("exam_runtime_missing_tenant_session");

    expect(
      resolveExamRuntimeIds("exam-1", {
        tenantId: "tenant-1",
        studentId: "student-1",
      }),
    ).toEqual({
      examId: "exam-1",
      attemptId: "exam-1:student-1:attempt",
      studentId: "student-1",
      tenantId: "tenant-1",
    });

    expect(
      resolveExamRuntimeIds("local-route-id", {
        examId: "backend-exam-1",
        attemptId: "attempt-1",
        studentId: "student-a",
        tenantId: "tenant-a",
      }),
    ).toEqual({
      examId: "backend-exam-1",
      attemptId: "attempt-1",
      studentId: "student-a",
      tenantId: "tenant-a",
    });
  });

  it("serializes answer maps to backend answer array payloads", () => {
    const answers: ExamAnswerState = { "q-1": "B,C", "q-2": "Essay answer" };
    expect(encodeSubmissionAnswers(answers)).toEqual([
      { questionId: "q-1", answer: "B,C" },
      { questionId: "q-2", answer: "Essay answer" },
    ]);
  });

  it("calls monitor, manual grading queue, and manual grade endpoints as teacher", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/monitor")) {
        return new Response(JSON.stringify({ examId: "exam-1", summary: { eligibleStudents: 1 }, latestReceipts: [], securityEvents: [] }), { status: 200 });
      }
      if (url.endsWith("/manual-grading")) {
        return new Response(JSON.stringify({ items: [{ attemptId: "attempt-1", studentId: "student-1", receiptId: "rct-1", autoScore: 10, maxScore: 30, requiresManualGrading: true }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ attemptId: "attempt-1", status: "completed", finalScore: 27 }), { status: 200 });
    });
    const client = createExamApiClient({ baseUrl: "http://localhost:8080", fetcher: fetchMock });
    const runtime = resolveExamRuntimeIds("exam-mid-math-x", {
      examId: "00000000-0000-4000-8000-000000000801",
      attemptId: "00000000-0000-4000-8000-000000000901",
      studentId: "00000000-0000-4000-8000-000000000301",
      tenantId: "00000000-0000-4000-8000-000000000001",
    });

    await expect(client.getMonitor(runtime, "teacher-1")).resolves.toMatchObject({ examId: "exam-1" });
    await expect(client.listManualGrading(runtime, "teacher-1")).resolves.toMatchObject({ items: [{ attemptId: "attempt-1" }] });
    await expect(client.recordManualGrade(runtime, "attempt-1", { manualScore: 17, feedback: "Baik", gradedBy: "teacher-1" })).resolves.toMatchObject({ status: "completed" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/exams/00000000-0000-4000-8000-000000000801/monitor",
      expect.objectContaining({ method: "GET", headers: expect.objectContaining({ "X-User-Role": "teacher", "X-User-ID": "teacher-1" }) }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/exams/00000000-0000-4000-8000-000000000801/attempts/attempt-1/manual-grade",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ manualScore: 17, feedback: "Baik", gradedBy: "teacher-1" }) }),
    );
  });

  it("calls gate, autosave, submit, and result endpoints with tenant headers", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/gate/check")) {
        return new Response(JSON.stringify({ allowed: true, gateToken: "gate-token", reasons: [] }), { status: 200 });
      }
      if (url.endsWith("/autosave")) {
        return new Response(JSON.stringify({ receiptId: "autosave-rct", status: "accepted" }), { status: 202 });
      }
      if (url.endsWith("/submit")) {
        return new Response(JSON.stringify({ receiptId: "final-rct", status: "accepted" }), { status: 202 });
      }
      return new Response(JSON.stringify({ ready: true, message: "result_ready" }), { status: 200 });
    });

    const client = createExamApiClient({ baseUrl: "http://localhost:8080", fetcher: fetchMock });
    const runtime = resolveExamRuntimeIds("exam-mid-math-x", {
      examId: "00000000-0000-4000-8000-000000000801",
      attemptId: "00000000-0000-4000-8000-000000000901",
      studentId: "00000000-0000-4000-8000-000000000301",
      tenantId: "00000000-0000-4000-8000-000000000001",
    });

    await expect(client.checkGate(runtime, "MATH-UTS")).resolves.toMatchObject({ allowed: true });
    await expect(client.autosave(runtime, { "q-1": "B" }, "gate-token")).resolves.toMatchObject({ receiptId: "autosave-rct" });
    await expect(client.submit(runtime, { "q-1": "B" }, "gate-token")).resolves.toMatchObject({ receiptId: "final-rct" });
    await expect(client.getResult(runtime)).resolves.toMatchObject({ ready: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/exams/00000000-0000-4000-8000-000000000801/gate/check",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "X-Tenant-ID": runtime.tenantId }) }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/exams/00000000-0000-4000-8000-000000000801/attempts/00000000-0000-4000-8000-000000000901/result",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
