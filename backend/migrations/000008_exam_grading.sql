-- Async grading foundation for final submissions.

ALTER TABLE exam_questions
    ADD COLUMN IF NOT EXISTS answer_key JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS exam_grade_results (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    receipt_id UUID NOT NULL REFERENCES exam_submission_receipts(receipt_id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('completed', 'waiting_for_grading')),
    auto_score INTEGER NOT NULL DEFAULT 0 CHECK (auto_score >= 0),
    max_score INTEGER NOT NULL DEFAULT 0 CHECK (max_score >= 0),
    requires_manual_grading BOOLEAN NOT NULL DEFAULT false,
    question_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    graded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, attempt_id, receipt_id)
);

CREATE INDEX IF NOT EXISTS ix_exam_grade_results_tenant_exam
    ON exam_grade_results (tenant_id, exam_id, graded_at DESC);

CREATE INDEX IF NOT EXISTS ix_exam_grade_results_manual_queue
    ON exam_grade_results (tenant_id, exam_id, graded_at DESC)
    WHERE requires_manual_grading = true;
