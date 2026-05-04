package exams

import (
	"context"
	"errors"
	"time"

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

func (repo PostgresSubmissionRepository) FetchUnrelayedSubmissions(ctx context.Context, limit int) ([]PendingSubmission, error) {
	if limit <= 0 {
		limit = 25
	}
	rows, err := repo.pool.Query(ctx, `
SELECT
    id,
    tenant_id::text,
    exam_id::text,
    attempt_id::text,
    student_id::text,
    receipt_id::text,
    submission_kind,
    payload::text,
    received_at
FROM exam_submission_inbox
WHERE relayed_at IS NULL
ORDER BY
    CASE WHEN submission_kind = 'final_submit' THEN 0 ELSE 1 END,
    received_at ASC
LIMIT $1
`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var submissions []PendingSubmission
	for rows.Next() {
		var submission PendingSubmission
		var payload string
		if err := rows.Scan(
			&submission.InboxID,
			&submission.TenantID,
			&submission.ExamID,
			&submission.AttemptID,
			&submission.StudentID,
			&submission.ReceiptID,
			&submission.SubmissionKind,
			&payload,
			&submission.ReceivedAt,
		); err != nil {
			return nil, err
		}
		submission.Payload = []byte(payload)
		submissions = append(submissions, submission)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return submissions, nil
}

func (repo PostgresSubmissionRepository) MarkSubmissionRelayed(ctx context.Context, inboxID int64, receivedAt time.Time) error {
	_, err := repo.pool.Exec(ctx, `
UPDATE exam_submission_inbox
SET relayed_at = now()
WHERE id = $1
    AND received_at = $2
    AND relayed_at IS NULL
`, inboxID, receivedAt)
	return err
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
