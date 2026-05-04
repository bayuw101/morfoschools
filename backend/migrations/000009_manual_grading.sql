-- Manual grading queue completion fields.

ALTER TABLE exam_grade_results
    ADD COLUMN IF NOT EXISTS manual_score INTEGER NOT NULL DEFAULT 0 CHECK (manual_score >= 0),
    ADD COLUMN IF NOT EXISTS final_score INTEGER NOT NULL DEFAULT 0 CHECK (final_score >= 0),
    ADD COLUMN IF NOT EXISTS feedback TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS graded_by TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS ix_exam_grade_results_waiting_manual
    ON exam_grade_results (tenant_id, exam_id, graded_at ASC)
    WHERE requires_manual_grading = true AND status = 'waiting_for_grading';
