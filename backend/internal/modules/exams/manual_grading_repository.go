package exams

import (
	"context"
	"encoding/json"
)

func (repo PostgresSubmissionRepository) ListManualGradingQueue(ctx context.Context, tenantID, examID string) ([]ManualGradingQueueItem, error) {
	rows, err := repo.pool.Query(ctx, `
SELECT exam_id::text, attempt_id::text, student_id::text, receipt_id::text, auto_score, max_score, question_results, requires_manual_grading, graded_at
FROM exam_grade_results
WHERE tenant_id=$1 AND exam_id=$2 AND requires_manual_grading=true AND status='waiting_for_grading'
ORDER BY graded_at ASC`, tenantID, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ManualGradingQueueItem{}
	for rows.Next() {
		var item ManualGradingQueueItem
		var questionResults []byte
		if err := rows.Scan(&item.ExamID, &item.AttemptID, &item.StudentID, &item.ReceiptID, &item.AutoScore, &item.MaxScore, &questionResults, &item.RequiresManualGrading, &item.GradedAt); err != nil {
			return nil, err
		}
		item.QuestionResults = json.RawMessage(questionResults)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (repo PostgresSubmissionRepository) RecordManualGrade(ctx context.Context, tenantID, examID, attemptID string, command ManualGradeCommand) (ManualGradeResult, error) {
	var result ManualGradeResult
	err := repo.pool.QueryRow(ctx, `
UPDATE exam_grade_results
SET manual_score=$4,
    final_score=auto_score + $4,
    feedback=$5,
    graded_by=$6,
    status='completed',
    requires_manual_grading=false,
    graded_at=now()
WHERE tenant_id=$1 AND exam_id=$2 AND attempt_id=$3
RETURNING exam_id::text, attempt_id::text, student_id::text, receipt_id::text, status, auto_score, manual_score, final_score, max_score, feedback, graded_by, graded_at`, tenantID, examID, attemptID, command.ManualScore, command.Feedback, command.GradedBy).Scan(&result.ExamID, &result.AttemptID, &result.StudentID, &result.ReceiptID, &result.Status, &result.AutoScore, &result.ManualScore, &result.FinalScore, &result.MaxScore, &result.Feedback, &result.GradedBy, &result.GradedAt)
	if err != nil {
		return result, err
	}
	if err := repo.UpdateAttemptStatus(ctx, tenantID, attemptID, "completed"); err != nil {
		return result, err
	}
	return result, nil
}
