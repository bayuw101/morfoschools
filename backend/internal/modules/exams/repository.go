package exams

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresSubmissionRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresSubmissionRepository(pool *pgxpool.Pool) PostgresSubmissionRepository {
	return PostgresSubmissionRepository{pool: pool}
}

func (repo PostgresSubmissionRepository) StoreSubmission(ctx context.Context, command SubmitExamCommand) (SubmissionReceipt, error) {
	var receipt SubmissionReceipt
	err := repo.pool.QueryRow(ctx, `
WITH inbox_insert AS (
    INSERT INTO exam_submission_inbox (tenant_id, exam_id, attempt_id, student_id, submission_kind, payload)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING id, receipt_id, received_at
), receipt_insert AS (
    INSERT INTO exam_submission_receipts (receipt_id, tenant_id, exam_id, attempt_id, student_id, received_at, inbox_id)
    SELECT receipt_id, $1, $2, $3, $4, received_at, id
    FROM inbox_insert
    RETURNING receipt_id
)
SELECT receipt_id::text, 'accepted', CASE WHEN $5 = 'autosave' THEN 'autosave_received' ELSE 'submission_received' END
FROM receipt_insert
`, command.TenantID, command.ExamID, command.AttemptID, command.StudentID, string(command.Kind), string(command.RawPayload)).Scan(&receipt.ReceiptID, &receipt.Status, &receipt.Message)
	if err != nil {
		return SubmissionReceipt{}, err
	}
	return receipt, nil
}
