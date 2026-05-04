-- Exam management foundation: authoring, targeting, gate windows, and prerequisites.

CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay')),
    prompt TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 1 CHECK (position > 0),
    points INTEGER NOT NULL DEFAULT 1 CHECK (points > 0),
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    rubric TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, exam_id, position)
);

CREATE INDEX IF NOT EXISTS ix_exam_questions_tenant_exam
    ON exam_questions (tenant_id, exam_id, position);

CREATE TABLE IF NOT EXISTS exam_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('class_section', 'subject_group', 'student')),
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, exam_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS ix_exam_targets_tenant_exam
    ON exam_targets (tenant_id, exam_id);

CREATE TABLE IF NOT EXISTS exam_gate_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL DEFAULT 'global' CHECK (target_type IN ('global', 'class_section', 'subject_group', 'student')),
    target_id UUID,
    publishes_at TIMESTAMPTZ,
    opens_at TIMESTAMPTZ NOT NULL,
    closes_at TIMESTAMPTZ NOT NULL,
    password TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (closes_at > opens_at)
);

CREATE INDEX IF NOT EXISTS ix_exam_gate_windows_tenant_exam
    ON exam_gate_windows (tenant_id, exam_id, opens_at);

CREATE TABLE IF NOT EXISTS exam_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    prerequisite_type TEXT NOT NULL CHECK (prerequisite_type IN ('course_completed', 'exam_completed')),
    required_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, exam_id, prerequisite_type, required_id)
);

CREATE INDEX IF NOT EXISTS ix_exam_prerequisites_tenant_exam
    ON exam_prerequisites (tenant_id, exam_id);
