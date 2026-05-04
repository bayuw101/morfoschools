package exams

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
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

func (repo PostgresSubmissionRepository) FindReceipt(ctx context.Context, tenantID string, receiptID string) (ReceiptVerification, bool, error) {
	var receipt ReceiptVerification
	err := repo.pool.QueryRow(ctx, `
SELECT
    receipts.receipt_id::text,
    'accepted',
    'receipt_verified',
    receipts.exam_id::text,
    receipts.attempt_id::text,
    receipts.student_id::text,
    inbox.submission_kind,
    receipts.received_at,
    inbox.relayed_at IS NOT NULL
FROM exam_submission_receipts receipts
JOIN exam_submission_inbox inbox
    ON inbox.id = receipts.inbox_id
    AND inbox.received_at = receipts.received_at
WHERE receipts.tenant_id = $1
    AND receipts.receipt_id = $2
LIMIT 1
`, tenantID, receiptID).Scan(
		&receipt.ReceiptID,
		&receipt.Status,
		&receipt.Message,
		&receipt.ExamID,
		&receipt.AttemptID,
		&receipt.StudentID,
		&receipt.SubmissionKind,
		&receipt.ReceivedAt,
		&receipt.Relayed,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ReceiptVerification{}, false, nil
		}
		return ReceiptVerification{}, false, err
	}
	return receipt, true, nil
}
