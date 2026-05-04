-- Exam gate/runtime security events.
-- Security events are append-only and intentionally separate from submission inbox.

CREATE TABLE IF NOT EXISTS exam_security_events (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('fullscreen_exit', 'tab_hidden', 'window_blur', 'copy_attempt', 'paste_attempt', 'network_offline', 'network_online')),
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_exam_security_events_tenant_exam_time
    ON exam_security_events (tenant_id, exam_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_exam_security_events_tenant_attempt
    ON exam_security_events (tenant_id, attempt_id, occurred_at DESC);
