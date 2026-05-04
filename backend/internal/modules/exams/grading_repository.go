package exams

import (
	"context"
	"encoding/json"
)

func (repo PostgresSubmissionRepository) FetchUngradedFinalSubmissions(ctx context.Context, limit int) ([]SubmissionRelayEvent, error) {
	if limit <= 0 {
		limit = 25
	}
	rows, err := repo.pool.Query(ctx, `
SELECT
    inbox.id,
    inbox.tenant_id::text,
    inbox.exam_id::text,
    inbox.attempt_id::text,
    inbox.student_id::text,
    inbox.receipt_id::text,
    inbox.submission_kind,
    inbox.payload::text,
    inbox.received_at
FROM exam_submission_inbox inbox
JOIN tenants tenants ON tenants.id = inbox.tenant_id
JOIN exams exams ON exams.id = inbox.exam_id AND exams.tenant_id = inbox.tenant_id
JOIN exam_attempts attempts ON attempts.id = inbox.attempt_id AND attempts.tenant_id = inbox.tenant_id
JOIN students students ON students.id = inbox.student_id AND students.tenant_id = inbox.tenant_id
JOIN exam_submission_receipts receipts ON receipts.receipt_id = inbox.receipt_id
WHERE inbox.submission_kind = 'final_submit'
  AND NOT EXISTS (
      SELECT 1 FROM exam_grade_results grades
      WHERE grades.tenant_id = inbox.tenant_id
        AND grades.attempt_id = inbox.attempt_id
        AND grades.receipt_id = inbox.receipt_id
  )
ORDER BY inbox.received_at ASC
LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	submissions := []SubmissionRelayEvent{}
	for rows.Next() {
		var event SubmissionRelayEvent
		var payload string
		if err := rows.Scan(&event.InboxID, &event.TenantID, &event.ExamID, &event.AttemptID, &event.StudentID, &event.ReceiptID, &event.SubmissionKind, &payload, &event.ReceivedAt); err != nil {
			return nil, err
		}
		event.Payload = json.RawMessage(payload)
		submissions = append(submissions, event)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return submissions, nil
}

func (repo PostgresSubmissionRepository) ListGradableQuestions(ctx context.Context, tenantID, examID string) ([]GradableQuestion, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT id::text, question_type, points, answer_key
FROM exam_questions
WHERE tenant_id=$1 AND exam_id=$2
ORDER BY position ASC`, tenantID, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	questions := []GradableQuestion{}
	for rows.Next() {
		var question GradableQuestion
		var answerKey []byte
		if err := rows.Scan(&question.ID, &question.QuestionType, &question.Points, &answerKey); err != nil {
			return nil, err
		}
		question.AnswerKey = json.RawMessage(answerKey)
		questions = append(questions, question)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return questions, nil
}

func (repo PostgresSubmissionRepository) RecordGradeResult(ctx context.Context, result ExamGradeResult) error {
	_, err := repo.pool.Exec(ctx, `
INSERT INTO exam_grade_results (tenant_id, exam_id, attempt_id, student_id, receipt_id, status, auto_score, max_score, requires_manual_grading, question_results)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
ON CONFLICT (tenant_id, attempt_id, receipt_id) DO UPDATE SET
    status = EXCLUDED.status,
    auto_score = EXCLUDED.auto_score,
    max_score = EXCLUDED.max_score,
    requires_manual_grading = EXCLUDED.requires_manual_grading,
    question_results = EXCLUDED.question_results,
    graded_at = now()`, result.TenantID, result.ExamID, result.AttemptID, result.StudentID, result.ReceiptID, result.Status, result.AutoScore, result.MaxScore, result.RequiresManualGrading, []byte(result.QuestionResults))
	return err
}

func (repo PostgresSubmissionRepository) UpdateAttemptStatus(ctx context.Context, tenantID, attemptID, status string) error {
	_, err := repo.pool.Exec(ctx, `
UPDATE exam_attempts
SET status=$3, submitted_at=COALESCE(submitted_at, now())
WHERE tenant_id=$1 AND id=$2`, tenantID, attemptID, status)
	return err
}
