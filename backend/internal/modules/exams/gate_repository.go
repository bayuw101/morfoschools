package exams

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
)

func (repo PostgresSubmissionRepository) CheckGate(ctx context.Context, tenantID, examID string, command ExamGateCheckCommand) (ExamGateDecision, error) {
	decision := ExamGateDecision{ExamID: examID, StudentID: command.StudentID, Reasons: []string{}}
	var eligible bool
	var blockedReasons []byte
	var accessToken string
	var isUsed bool
	err := repo.pool.QueryRow(ctx, `
SELECT eligibility_status = 'eligible', blocking_reasons, access_token, is_used
FROM exam_eligible_students
WHERE tenant_id=$1 AND exam_id=$2 AND student_id=$3`, tenantID, examID, command.StudentID).Scan(&eligible, &blockedReasons, &accessToken, &isUsed)
	if err != nil {
		decision.Reasons = append(decision.Reasons, "not_eligible")
		return decision, nil
	}
	if !eligible {
		var reasons []string
		_ = json.Unmarshal(blockedReasons, &reasons)
		if len(reasons) == 0 {
			reasons = []string{"prerequisite_blocked"}
		}
		decision.Reasons = append(decision.Reasons, reasons...)
		return decision, nil
	}

	var gateOpen bool
	err = repo.pool.QueryRow(ctx, `
SELECT EXISTS (
    SELECT 1
    FROM exam_gate_windows
    WHERE tenant_id=$1 AND exam_id=$2
      AND now() >= COALESCE(publishes_at, opens_at)
      AND now() >= opens_at
      AND now() <= closes_at
      AND (password = '' OR password = $3)
)`, tenantID, examID, command.Password).Scan(&gateOpen)
	if err != nil {
		return ExamGateDecision{}, err
	}
	if !gateOpen {
		decision.Reasons = append(decision.Reasons, "gate_closed_or_password_invalid")
		return decision, nil
	}
	if isUsed {
		decision.Reasons = append(decision.Reasons, "token_already_used_active_session_exists")
		return decision, nil
	}

	// Mark token as used
	_, err = repo.pool.Exec(ctx, `UPDATE exam_eligible_students SET is_used = true, used_at = now() WHERE tenant_id=$1 AND exam_id=$2 AND student_id=$3`, tenantID, examID, command.StudentID)
	if err != nil {
		return ExamGateDecision{}, err
	}

	decision.Allowed = true
	decision.GateToken = accessToken
	return decision, nil
}

func (repo PostgresSubmissionRepository) RecordSecurityEvent(ctx context.Context, tenantID, examID, attemptID string, command RecordSecurityEventCommand) (ExamSecurityEvent, error) {
	metadata, err := json.Marshal(command.Metadata)
	if err != nil {
		return ExamSecurityEvent{}, err
	}
	var event ExamSecurityEvent
	var raw []byte
	err = repo.pool.QueryRow(ctx, `
INSERT INTO exam_security_events (tenant_id, exam_id, attempt_id, student_id, event_type, severity, metadata)
VALUES ($1,$2,$3,$4,$5,$6,$7)
RETURNING id::text, exam_id::text, attempt_id::text, student_id::text, event_type, severity, metadata, occurred_at`, tenantID, examID, attemptID, command.StudentID, command.EventType, command.Severity, metadata).Scan(&event.ID, &event.ExamID, &event.AttemptID, &event.StudentID, &event.EventType, &event.Severity, &raw, &event.OccurredAt)
	if err != nil {
		return event, err
	}
	_ = json.Unmarshal(raw, &event.Metadata)
	return event, nil
}

func generateGateToken() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "gate-token"
	}
	return hex.EncodeToString(buf)
}
