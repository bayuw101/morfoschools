-- Materialized Exam Eligibility access token hardening.
-- The core exam_eligible_students table exists from exam management work.
-- This migration adds token reuse control for Exam Gate without rebuilding the table.

ALTER TABLE exam_eligible_students
    ADD COLUMN IF NOT EXISTS access_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
    ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

UPDATE exam_eligible_students
SET access_token = encode(gen_random_bytes(16), 'hex')
WHERE access_token IS NULL OR access_token = '';

ALTER TABLE exam_eligible_students
    ALTER COLUMN access_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_eligible_students_access_token
    ON exam_eligible_students (access_token);

CREATE INDEX IF NOT EXISTS ix_exam_eligible_students_tenant_token
    ON exam_eligible_students (tenant_id, access_token);

CREATE INDEX IF NOT EXISTS ix_exam_eligible_students_tenant_exam
    ON exam_eligible_students (tenant_id, exam_id);
