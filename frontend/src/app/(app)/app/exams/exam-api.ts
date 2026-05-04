import type { Exam, GateRule, Prerequisites, Question, Targeting } from "./data";
import { fetchApi } from "@/lib/api-client";

export type BackendExam = {
  id: string;
  title: string;
  subjectName: string;
  status: Exam["status"];
  durationMinutes: number;
  securityMode: Exam["securityMode"];
  questionCount?: number;
};

export type BackendQuestion = {
  id: string;
  questionType: Question["type"];
  prompt: string;
  points: number;
  options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  rubric?: string;
};

export type BackendTarget = { id: string; targetType: string; targetId: string };
export type BackendGateWindow = { id: string; targetType: string; targetId?: string; publishesAt?: string; opensAt: string; closesAt: string; password?: string };
export type BackendPrerequisite = { id: string; prerequisiteType: string; requiredId: string };

const DEFAULT_EXAM_RULES = "Kerjakan mandiri. Sistem menyimpan jawaban otomatis dan submit akhir memakai digital receipt.";

export function mapBackendExamToDomain(
  exam: BackendExam,
  parts: {
    questions?: BackendQuestion[];
    targets?: BackendTarget[];
    gateWindows?: BackendGateWindow[];
    prerequisites?: BackendPrerequisite[];
    submissions?: number;
  } = {},
): Exam {
  const questions = (parts.questions ?? Array.from({ length: exam.questionCount ?? 0 }, (_, index) => ({
    id: `${exam.id}-q-${index + 1}`,
    questionType: "multiple_choice" as const,
    prompt: `Question ${index + 1}`,
    points: 0,
  }))).map(mapBackendQuestionToDomain);

  return {
    id: exam.id,
    title: exam.title,
    subject: exam.subjectName,
    duration: `${exam.durationMinutes} menit`,
    status: exam.status,
    rules: DEFAULT_EXAM_RULES,
    securityMode: exam.securityMode,
    submissions: parts.submissions ?? 0,
    questions,
    targeting: mapTargets(parts.targets ?? []),
    prerequisites: mapPrerequisites(parts.prerequisites ?? []),
    gateRules: (parts.gateWindows ?? []).map(mapGateWindowToDomain),
  };
}

export function mapBackendQuestionToDomain(question: BackendQuestion): Question {
  const correctIds = (question.options ?? []).filter((option) => option.isCorrect).map((option) => option.id);
  return {
    id: question.id,
    prompt: question.prompt,
    type: question.questionType,
    points: String(question.points),
    answerKey: question.rubric || correctIds.join(",") || "Belum ada answer key",
    options: question.options?.map((option) => ({ id: option.id, text: option.text })),
    correctOptionId: correctIds[0],
    correctOptionIds: correctIds,
    scoringMode: "all_or_nothing",
  };
}

export function mapTargets(targets: BackendTarget[]): Targeting {
  return targets.reduce<Targeting>((acc, target) => {
    const value = target.targetId;
    if (target.targetType === "subject_group") acc.subjectGroups.push(value);
    else if (target.targetType === "class_section") acc.classSections.push(value);
    else if (target.targetType === "student") acc.students.push(value);
    return acc;
  }, { subjectGroups: [], classSections: [], students: [] });
}

export function mapPrerequisites(items: BackendPrerequisite[]): Prerequisites {
  return items.reduce<Prerequisites>((acc, item) => {
    if (item.prerequisiteType === "course_completed") acc.courses.push(item.requiredId);
    else if (item.prerequisiteType === "exam_passed") acc.exams.push(item.requiredId);
    return acc;
  }, { courses: [], exams: [] });
}

export function mapGateWindowToDomain(window: BackendGateWindow): GateRule {
  return {
    id: window.id,
    scope: window.targetType === "student" ? "student" : window.targetType === "subject_group" ? "group" : "class",
    targets: window.targetId ? [window.targetId] : [],
    passwordEnabled: Boolean(window.password),
    password: window.password ?? "",
    publishAt: window.publishesAt ?? "",
    openAt: window.opensAt,
    closeAt: window.closesAt,
  };
}

export async function listExams(): Promise<Exam[]> {
  const response = await fetchApi<{ data: BackendExam[] }>("/api/v1/exams");
  return (response.data ?? []).map((exam) => mapBackendExamToDomain(exam));
}

export async function getExamDetail(examId: string): Promise<Exam> {
  const [exam, questions, targets, gateWindows, prerequisites] = await Promise.all([
    fetchApi<BackendExam>(`/api/v1/exams/${examId}`),
    fetchApi<{ data: BackendQuestion[] }>(`/api/v1/exams/${examId}/questions`),
    fetchApi<{ data: BackendTarget[] }>(`/api/v1/exams/${examId}/targets`),
    fetchApi<{ data: BackendGateWindow[] }>(`/api/v1/exams/${examId}/gate-windows`),
    fetchApi<{ data: BackendPrerequisite[] }>(`/api/v1/exams/${examId}/prerequisites`),
  ]);
  return mapBackendExamToDomain(exam, {
    questions: questions.data,
    targets: targets.data,
    gateWindows: gateWindows.data,
    prerequisites: prerequisites.data,
  });
}
