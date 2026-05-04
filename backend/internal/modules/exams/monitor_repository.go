package exams

import (
	"context"
	"encoding/json"
	"time"
)

func (repo PostgresSubmissionRepository) GetExamMonitor(ctx context.Context, tenantID, examID string) (ExamMonitor, error) {
	monitor := ExamMonitor{ExamID: examID, LatestReceipts: []MonitorReceipt{}, SecurityEvents: []ExamSecurityEvent{}, GeneratedAt: time.Now().UTC()}
	if err := repo.loadMonitorSummary(ctx, tenantID, examID, &monitor.Summary); err != nil {
		return ExamMonitor{}, err
	}
	receipts, err := repo.listMonitorReceipts(ctx, tenantID, examID, 10)
	if err != nil {
		return ExamMonitor{}, err
	}
	events, err := repo.listMonitorSecurityEvents(ctx, tenantID, examID, 20)
	if err != nil {
		return ExamMonitor{}, err
	}
	monitor.LatestReceipts = receipts
	monitor.SecurityEvents = events
	return monitor, nil
}

func (repo PostgresSubmissionRepository) loadMonitorSummary(ctx context.Context, tenantID, examID string, summary *MonitorSummary) error {
	return repo.pool.QueryRow(ctx, `
WITH eligibility AS (
    SELECT
        COUNT(*) FILTER (WHERE eligibility_status = 'eligible') AS eligible_students,
        COUNT(*) FILTER (WHERE eligibility_status = 'blocked') AS blocked_students
    FROM exam_eligible_students
    WHERE tenant_id = $1 AND exam_id = $2
), attempts AS (
    SELECT
        COUNT(*) FILTER (WHERE status = 'started') AS started_attempts,
        COUNT(*) FILTER (WHERE status = 'submitted') AS submitted_attempts,
        COUNT(*) FILTER (WHERE status = 'waiting_for_grading') AS waiting_for_grading_attempts,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_attempts
    FROM exam_attempts
    WHERE tenant_id = $1 AND exam_id = $2
), inbox AS (
    SELECT
        COUNT(*) FILTER (WHERE relayed_at IS NULL) AS unrelayed_submissions,
        COALESCE(EXTRACT(EPOCH FROM (now() - MIN(received_at) FILTER (WHERE relayed_at IS NULL)))::int, 0) AS oldest_unrelayed_seconds
    FROM exam_submission_inbox
    WHERE tenant_id = $1 AND exam_id = $2
), security AS (
    SELECT
        COUNT(*) FILTER (WHERE severity = 'warning') AS security_warning_events,
        COUNT(*) FILTER (WHERE severity = 'critical') AS security_critical_events
    FROM exam_security_events
    WHERE tenant_id = $1 AND exam_id = $2
)
SELECT
    eligibility.eligible_students,
    eligibility.blocked_students,
    attempts.started_attempts,
    attempts.submitted_attempts,
    attempts.waiting_for_grading_attempts,
    attempts.completed_attempts,
    inbox.unrelayed_submissions,
    inbox.oldest_unrelayed_seconds,
    security.security_warning_events,
    security.security_critical_events
FROM eligibility, attempts, inbox, security`, tenantID, examID).Scan(
		&summary.EligibleStudents,
		&summary.BlockedStudents,
		&summary.StartedAttempts,
		&summary.SubmittedAttempts,
		&summary.WaitingForGradingAttempts,
		&summary.CompletedAttempts,
		&summary.UnrelayedSubmissions,
		&summary.OldestUnrelayedSeconds,
		&summary.SecurityWarningEvents,
		&summary.SecurityCriticalEvents,
	)
}

func (repo PostgresSubmissionRepository) listMonitorReceipts(ctx context.Context, tenantID, examID string, limit int) ([]MonitorReceipt, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := repo.pool.Query(ctx, `
SELECT receipts.receipt_id::text, receipts.attempt_id::text, receipts.student_id::text, inbox.submission_kind, receipts.received_at, inbox.relayed_at IS NOT NULL
FROM exam_submission_receipts receipts
JOIN exam_submission_inbox inbox
    ON inbox.id = receipts.inbox_id
    AND inbox.received_at = receipts.received_at
WHERE receipts.tenant_id = $1 AND receipts.exam_id = $2
ORDER BY receipts.received_at DESC
LIMIT $3`, tenantID, examID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	receipts := []MonitorReceipt{}
	for rows.Next() {
		var receipt MonitorReceipt
		if err := rows.Scan(&receipt.ReceiptID, &receipt.AttemptID, &receipt.StudentID, &receipt.SubmissionKind, &receipt.ReceivedAt, &receipt.Relayed); err != nil {
			return nil, err
		}
		receipts = append(receipts, receipt)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return receipts, nil
}

func (repo PostgresSubmissionRepository) listMonitorSecurityEvents(ctx context.Context, tenantID, examID string, limit int) ([]ExamSecurityEvent, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := repo.pool.Query(ctx, `
SELECT id::text, exam_id::text, attempt_id::text, student_id::text, event_type, severity, metadata, occurred_at
FROM exam_security_events
WHERE tenant_id = $1 AND exam_id = $2
ORDER BY occurred_at DESC
LIMIT $3`, tenantID, examID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	events := []ExamSecurityEvent{}
	for rows.Next() {
		var event ExamSecurityEvent
		var metadata []byte
		if err := rows.Scan(&event.ID, &event.ExamID, &event.AttemptID, &event.StudentID, &event.EventType, &event.Severity, &metadata, &event.OccurredAt); err != nil {
			return nil, err
		}
		if len(metadata) > 0 {
			var decoded map[string]any
			if err := json.Unmarshal(metadata, &decoded); err == nil {
				event.Metadata = decoded
			}
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return events, nil
}
