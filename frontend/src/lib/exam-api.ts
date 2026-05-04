export type ExamRuntimeIds = {
  tenantId: string;
  examId: string;
  attemptId: string;
  studentId: string;
};

export type ExamApiIdentity = {
  tenantId: string;
  userId?: string;
  userRole?: string;
  gateToken?: string;
};

export type ExamAnswerState = Record<string, string>;

export type GateDecision = {
  examId?: string;
  studentId?: string;
  allowed: boolean;
  gateToken?: string;
  reasons: string[];
};

export type SubmissionReceipt = {
  receiptId: string;
  status: string;
  message?: string;
};

export type ExamResultReadModel = {
  examId?: string;
  attemptId?: string;
  studentId?: string;
  status?: string;
  ready: boolean;
  message: string;
  receipt?: {
    receiptId: string;
    status: string;
    submissionKind: string;
    receivedAt: string;
    relayed: boolean;
  };
  grading?: {
    status: string;
    autoScore: number;
    manualScore: number;
    finalScore: number;
    maxScore: number;
    requiresManualGrading: boolean;
    feedback?: string;
  };
};

export type ExamMonitorReadModel = {
  examId: string;
  summary: {
    eligibleStudents?: number;
    blockedStudents?: number;
    startedAttempts?: number;
    submittedAttempts?: number;
    waitingForGradingAttempts?: number;
    completedAttempts?: number;
    unrelayedSubmissions?: number;
    oldestUnrelayedSeconds?: number;
    securityWarningEvents?: number;
    securityCriticalEvents?: number;
  };
  latestReceipts: Array<{
    receiptId: string;
    attemptId: string;
    studentId: string;
    submissionKind: string;
    receivedAt: string;
    relayed: boolean;
  }>;
  securityEvents: Array<{
    id: string;
    attemptId: string;
    studentId: string;
    eventType: string;
    severity: string;
    occurredAt: string;
  }>;
  generatedAt?: string;
};

export type ManualGradingQueueItem = {
  examId?: string;
  attemptId: string;
  studentId: string;
  receiptId: string;
  autoScore: number;
  maxScore: number;
  requiresManualGrading: boolean;
  questionResults?: unknown;
  gradedAt?: string;
};

export type ManualGradingQueue = { items: ManualGradingQueueItem[] };
export type ManualGradeInput = { manualScore: number; feedback: string; gradedBy: string };
export type ManualGradeResult = ManualGradeInput & {
  examId?: string;
  attemptId: string;
  studentId?: string;
  receiptId?: string;
  status: string;
  autoScore?: number;
  finalScore?: number;
  maxScore?: number;
  gradedAt?: string;
};

const DEMO_TENANT_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_STUDENT_ID = "00000000-0000-4000-8000-000000000301";
const DEMO_EXAM_ID = "00000000-0000-4000-8000-000000000801";
const DEMO_ATTEMPT_ID = "00000000-0000-4000-8000-000000000901";

const demoRuntimeByLocalExamId: Record<string, ExamRuntimeIds> = {
  "exam-mid-math-x": {
    tenantId: DEMO_TENANT_ID,
    examId: DEMO_EXAM_ID,
    attemptId: DEMO_ATTEMPT_ID,
    studentId: DEMO_STUDENT_ID,
  },
};

export function resolveExamRuntimeIds(
  localExamId: string,
  overrides: Partial<ExamRuntimeIds> = {},
): ExamRuntimeIds {
  const fallback: ExamRuntimeIds = {
    tenantId: DEMO_TENANT_ID,
    examId: localExamId,
    attemptId: `${localExamId}-attempt`,
    studentId: DEMO_STUDENT_ID,
  };
  return { ...(demoRuntimeByLocalExamId[localExamId] ?? fallback), ...overrides };
}

export function buildExamApiHeaders(identity: ExamApiIdentity): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const tenantId = identity.tenantId.trim();
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  const userId = identity.userId?.trim();
  if (userId) headers["X-User-ID"] = userId;
  const userRole = identity.userRole?.trim();
  if (userRole) headers["X-User-Role"] = userRole;
  const gateToken = identity.gateToken?.trim();
  if (gateToken) headers["X-Exam-Gate-Token"] = gateToken;
  return headers;
}

export function encodeSubmissionAnswers(answers: ExamAnswerState): Array<{ questionId: string; answer: string }> {
  return Object.entries(answers)
    .filter(([, answer]) => answer.trim() !== "")
    .map(([questionId, answer]) => ({ questionId, answer }));
}

export type ExamApiClientOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export function createExamApiClient(options: ExamApiClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(path: string, init: RequestInit & { identity: ExamApiIdentity }): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers: { ...buildExamApiHeaders(init.identity), ...(init.headers as Record<string, string> | undefined) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof payload?.error === "string" ? payload.error : `request_failed_${response.status}`;
      throw new Error(message);
    }
    return payload as T;
  }

  return {
    checkGate(runtime: ExamRuntimeIds, password: string) {
      return request<GateDecision>(`/api/v1/exams/${runtime.examId}/gate/check`, {
        method: "POST",
        identity: { tenantId: runtime.tenantId, userId: runtime.studentId, userRole: "student" },
        body: JSON.stringify({ studentId: runtime.studentId, password }),
      });
    },

    autosave(runtime: ExamRuntimeIds, answers: ExamAnswerState, gateToken?: string) {
      return request<SubmissionReceipt>(`/api/v1/exams/${runtime.examId}/attempts/${runtime.attemptId}/autosave`, {
        method: "POST",
        identity: { tenantId: runtime.tenantId, userId: runtime.studentId, userRole: "student", gateToken },
        body: JSON.stringify({ studentId: runtime.studentId, answers: encodeSubmissionAnswers(answers) }),
      });
    },

    submit(runtime: ExamRuntimeIds, answers: ExamAnswerState, gateToken?: string) {
      return request<SubmissionReceipt>(`/api/v1/exams/${runtime.examId}/attempts/${runtime.attemptId}/submit`, {
        method: "POST",
        identity: { tenantId: runtime.tenantId, userId: runtime.studentId, userRole: "student", gateToken },
        body: JSON.stringify({ studentId: runtime.studentId, answers: encodeSubmissionAnswers(answers) }),
      });
    },

    getResult(runtime: ExamRuntimeIds) {
      return request<ExamResultReadModel>(`/api/v1/exams/${runtime.examId}/attempts/${runtime.attemptId}/result`, {
        method: "GET",
        identity: { tenantId: runtime.tenantId, userId: runtime.studentId, userRole: "student" },
      });
    },

    getMonitor(runtime: ExamRuntimeIds, teacherId: string) {
      return request<ExamMonitorReadModel>(`/api/v1/exams/${runtime.examId}/monitor`, {
        method: "GET",
        identity: { tenantId: runtime.tenantId, userId: teacherId, userRole: "teacher" },
      });
    },

    listManualGrading(runtime: ExamRuntimeIds, teacherId: string) {
      return request<ManualGradingQueue>(`/api/v1/exams/${runtime.examId}/manual-grading`, {
        method: "GET",
        identity: { tenantId: runtime.tenantId, userId: teacherId, userRole: "teacher" },
      });
    },

    recordManualGrade(runtime: ExamRuntimeIds, attemptId: string, grade: ManualGradeInput) {
      return request<ManualGradeResult>(`/api/v1/exams/${runtime.examId}/attempts/${attemptId}/manual-grade`, {
        method: "POST",
        identity: { tenantId: runtime.tenantId, userId: grade.gradedBy, userRole: "teacher" },
        body: JSON.stringify(grade),
      });
    },
  };
}
