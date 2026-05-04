package exams

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
)

func (repo PostgresSubmissionRepository) FindExamResult(ctx context.Context, tenantID, examID, attemptID string) (ExamResult, bool, error) {
	var result ExamResult
	var receipt ResultReceipt
	var grading ResultGrading
	var questionResults []byte
	var receiptID, submissionKind sql.NullString
	var receivedAt sql.NullTime
	var gradingStatus sql.NullString
	var autoScore, manualScore, finalScore, maxScore sql.NullInt64
	var requiresManualGrading sql.NullBool
	var feedback, gradedBy sql.NullString
	var gradedAt sql.NullTime
	err := repo.pool.QueryRow(ctx, `
WITH latest_receipt AS (
    SELECT receipts.receipt_id, inbox.submission_kind, receipts.received_at, inbox.relayed_at IS NOT NULL AS relayed
    FROM exam_submission_receipts receipts
    JOIN exam_submission_inbox inbox
        ON inbox.id = receipts.inbox_id
        AND inbox.received_at = receipts.received_at
    WHERE receipts.tenant_id = $1
      AND receipts.exam_id = $2
      AND receipts.attempt_id = $3
    ORDER BY receipts.received_at DESC
    LIMIT 1
), latest_grade AS (
    SELECT status, auto_score, manual_score, final_score, max_score, requires_manual_grading, question_results, feedback, graded_by, graded_at
    FROM exam_grade_results
    WHERE tenant_id = $1
      AND exam_id = $2
      AND attempt_id = $3
    ORDER BY graded_at DESC
    LIMIT 1
)
SELECT
    attempts.exam_id::text,
    attempts.id::text,
    attempts.student_id::text,
    attempts.status,
    latest_receipt.receipt_id::text,
    COALESCE(latest_receipt.submission_kind, ''),
    latest_receipt.received_at,
    COALESCE(latest_receipt.relayed, false),
    latest_grade.status,
    latest_grade.auto_score,
    latest_grade.manual_score,
    latest_grade.final_score,
    latest_grade.max_score,
    latest_grade.requires_manual_grading,
    COALESCE(latest_grade.question_results, '[]'::jsonb),
    latest_grade.feedback,
    latest_grade.graded_by,
    latest_grade.graded_at
FROM exam_attempts attempts
LEFT JOIN latest_receipt ON true
LEFT JOIN latest_grade ON true
WHERE attempts.tenant_id = $1
  AND attempts.exam_id = $2
  AND attempts.id = $3
LIMIT 1`, tenantID, examID, attemptID).Scan(
		&result.ExamID,
		&result.AttemptID,
		&result.StudentID,
		&result.Status,
		&receiptID,
		&submissionKind,
		&receivedAt,
		&receipt.Relayed,
		&gradingStatus,
		&autoScore,
		&manualScore,
		&finalScore,
		&maxScore,
		&requiresManualGrading,
		&questionResults,
		&feedback,
		&gradedBy,
		&gradedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ExamResult{}, false, nil
		}
		return ExamResult{}, false, err
	}
	if receiptID.Valid {
		receipt.ReceiptID = receiptID.String
		receipt.Status = "accepted"
	}
	if submissionKind.Valid {
		receipt.SubmissionKind = SubmissionKind(submissionKind.String)
	}
	if receivedAt.Valid {
		receipt.ReceivedAt = receivedAt.Time
	}
	grading.Status = "pending"
	if gradingStatus.Valid {
		grading.Status = gradingStatus.String
	}
	if autoScore.Valid {
		grading.AutoScore = int(autoScore.Int64)
	}
	if manualScore.Valid {
		grading.ManualScore = int(manualScore.Int64)
	}
	if finalScore.Valid {
		grading.FinalScore = int(finalScore.Int64)
	} else {
		grading.FinalScore = grading.AutoScore + grading.ManualScore
	}
	if maxScore.Valid {
		grading.MaxScore = int(maxScore.Int64)
	}
	if requiresManualGrading.Valid {
		grading.RequiresManualGrading = requiresManualGrading.Bool
	}
	if len(questionResults) > 0 {
		grading.QuestionResults = json.RawMessage(questionResults)
	}
	if feedback.Valid {
		grading.Feedback = feedback.String
	}
	if gradedBy.Valid {
		grading.GradedBy = gradedBy.String
	}
	if gradedAt.Valid {
		grading.GradedAt = gradedAt.Time
	}
	result.Receipt = receipt
	result.Grading = grading
	return normalizeExamResult(result), true, nil
}
