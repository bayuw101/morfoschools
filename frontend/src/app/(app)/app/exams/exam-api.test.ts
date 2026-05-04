import { describe, expect, it, vi } from "vitest";
import { getExamDetail, listExams, mapBackendExamToDomain } from "./exam-api";

vi.mock("@/lib/api-client", () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from "@/lib/api-client";

const fetchApiMock = vi.mocked(fetchApi);

describe("exam management api mapper", () => {
  it("maps backend exam summary into the frontend domain without dummy rows", () => {
    expect(mapBackendExamToDomain({
      id: "exam-1",
      title: "UTS Matematika",
      subjectName: "Matematika X",
      status: "scheduled",
      durationMinutes: 90,
      securityMode: "secure_required",
      questionCount: 2,
    })).toMatchObject({
      id: "exam-1",
      subject: "Matematika X",
      duration: "90 menit",
      questions: [{ id: "exam-1-q-1" }, { id: "exam-1-q-2" }],
      targeting: { subjectGroups: [], classSections: [], students: [] },
      gateRules: [],
    });
  });

  it("loads exam list from the collection endpoint", async () => {
    fetchApiMock.mockResolvedValueOnce({ data: [{
      id: "exam-1",
      title: "UTS Matematika",
      subjectName: "Matematika X",
      status: "draft",
      durationMinutes: 75,
      securityMode: "secure_required",
      questionCount: 0,
    }] });

    await expect(listExams()).resolves.toEqual([expect.objectContaining({ id: "exam-1", duration: "75 menit" })]);
    expect(fetchApiMock).toHaveBeenCalledWith("/api/v1/exams");
  });

  it("loads exam detail from exam child resources", async () => {
    fetchApiMock.mockClear();
    fetchApiMock
      .mockResolvedValueOnce({ id: "exam-1", title: "UTS", subjectName: "Math", status: "published", durationMinutes: 90, securityMode: "secure_required" })
      .mockResolvedValueOnce({ data: [{ id: "q-1", questionType: "multiple_choice", prompt: "2+2?", points: 10, options: [{ id: "A", text: "4", isCorrect: true }] }] })
      .mockResolvedValueOnce({ data: [{ id: "t-1", targetType: "subject_group", targetId: "group-1" }] })
      .mockResolvedValueOnce({ data: [{ id: "g-1", targetType: "class_section", targetId: "10-A", opensAt: "2026-05-06T08:00", closesAt: "2026-05-06T10:00", password: "[REDACTED]" }] })
      .mockResolvedValueOnce({ data: [{ id: "p-1", prerequisiteType: "course_completed", requiredId: "course-1" }] });

    await expect(getExamDetail("exam-1")).resolves.toMatchObject({
      id: "exam-1",
      questions: [{ id: "q-1", answerKey: "A" }],
      targeting: { subjectGroups: ["group-1"] },
      gateRules: [{ id: "g-1", passwordEnabled: true }],
      prerequisites: { courses: ["course-1"] },
    });
    expect(fetchApiMock).toHaveBeenNthCalledWith(1, "/api/v1/exams/exam-1");
    expect(fetchApiMock).toHaveBeenNthCalledWith(2, "/api/v1/exams/exam-1/questions");
  });
});
