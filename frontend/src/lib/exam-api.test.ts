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

  it("maps local demo exam ids to backend deterministic ids", () => {
    expect(resolveExamRuntimeIds("exam-mid-math-x")).toEqual({
      examId: "00000000-0000-4000-8000-000000000801",
      attemptId: "00000000-0000-4000-8000-000000000901",
      studentId: "00000000-0000-4000-8000-000000000301",
      tenantId: "00000000-0000-4000-8000-000000000001",
    });

    expect(resolveExamRuntimeIds("custom-exam", { studentId: "student-a" })).toEqual({
      examId: "custom-exam",
      attemptId: "custom-exam-attempt",
      studentId: "student-a",
      tenantId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("serializes answer maps to backend answer array payloads", () => {
    const answers: ExamAnswerState = { "q-1": "B,C", "q-2": "Essay answer" };
    expect(encodeSubmissionAnswers(answers)).toEqual([
      { questionId: "q-1", answer: "B,C" },
      { questionId: "q-2", answer: "Essay answer" },
    ]);
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
    const runtime = resolveExamRuntimeIds("exam-mid-math-x");

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
