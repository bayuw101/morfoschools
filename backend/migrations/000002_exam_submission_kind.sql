-- Track whether an inbox row is a lightweight autosave or final submission.
ALTER TABLE exam_submission_inbox
    ADD COLUMN IF NOT EXISTS submission_kind TEXT NOT NULL DEFAULT 'final_submit'
    CHECK (submission_kind IN ('autosave', 'final_submit'));

CREATE INDEX IF NOT EXISTS ix_exam_submission_inbox_kind_unrelayed
    ON exam_submission_inbox (submission_kind, received_at)
    WHERE relayed_at IS NULL;
