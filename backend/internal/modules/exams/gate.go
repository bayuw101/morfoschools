package exams

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type ExamGateCheckCommand struct {
	StudentID string `json:"studentId"`
	Password  string `json:"password"`
}

type ExamGateDecision struct {
	ExamID    string   `json:"examId"`
	StudentID string   `json:"studentId"`
	Allowed   bool     `json:"allowed"`
	GateToken string   `json:"gateToken,omitempty"`
	Reasons   []string `json:"reasons"`
}

type RecordSecurityEventCommand struct {
	StudentID string         `json:"studentId"`
	EventType string         `json:"eventType"`
	Severity  string         `json:"severity"`
	Metadata  map[string]any `json:"metadata"`
}

type ExamSecurityEvent struct {
	ID         string         `json:"id"`
	ExamID     string         `json:"examId"`
	AttemptID  string         `json:"attemptId"`
	StudentID  string         `json:"studentId"`
	EventType  string         `json:"eventType"`
	Severity   string         `json:"severity"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	OccurredAt time.Time      `json:"occurredAt"`
}

type GateRepository interface {
	CheckGate(ctx context.Context, tenantID, examID string, command ExamGateCheckCommand) (ExamGateDecision, error)
	RecordSecurityEvent(ctx context.Context, tenantID, examID, attemptID string, command RecordSecurityEventCommand) (ExamSecurityEvent, error)
}

type GateHandler struct{ repo GateRepository }

func NewGateHandler(repo GateRepository) http.Handler { return GateHandler{repo: repo} }

func (h GateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/")
	if examID, ok := parseGateCheckPath(path); ok {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		var cmd ExamGateCheckCommand
		if json.NewDecoder(r.Body).Decode(&cmd) != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		cmd = normalizeGateCheck(cmd)
		if err := validateGateCheck(cmd); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		decision, err := h.repo.CheckGate(r.Context(), tenantID, examID, cmd)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "check_gate_failed"})
			return
		}
		writeJSON(w, http.StatusOK, decision)
		return
	}
	examID, attemptID, ok := parseSecurityEventPath(path)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}
	var cmd RecordSecurityEventCommand
	if json.NewDecoder(r.Body).Decode(&cmd) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	cmd = normalizeSecurityEvent(cmd)
	if err := validateSecurityEvent(cmd); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	event, err := h.repo.RecordSecurityEvent(r.Context(), tenantID, examID, attemptID, cmd)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "record_security_event_failed"})
		return
	}
	writeJSON(w, http.StatusCreated, event)
}

func parseGateCheckPath(path string) (string, bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 6 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[3] != "" && parts[4] == "gate" && parts[5] == "check" {
		return parts[3], true
	}
	return "", false
}

func parseSecurityEventPath(path string) (string, string, bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 7 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[3] != "" && parts[4] == "attempts" && parts[5] != "" && parts[6] == "security-events" {
		return parts[3], parts[5], true
	}
	return "", "", false
}

func normalizeGateCheck(cmd ExamGateCheckCommand) ExamGateCheckCommand {
	cmd.StudentID = strings.TrimSpace(cmd.StudentID)
	cmd.Password = strings.TrimSpace(cmd.Password)
	return cmd
}
func validateGateCheck(cmd ExamGateCheckCommand) error {
	if cmd.StudentID == "" {
		return errors.New("student_required")
	}
	return nil
}
func normalizeSecurityEvent(cmd RecordSecurityEventCommand) RecordSecurityEventCommand {
	cmd.StudentID = strings.TrimSpace(cmd.StudentID)
	cmd.EventType = strings.ToLower(strings.TrimSpace(cmd.EventType))
	cmd.Severity = strings.ToLower(strings.TrimSpace(cmd.Severity))
	if cmd.Severity == "" {
		cmd.Severity = "info"
	}
	if cmd.Metadata == nil {
		cmd.Metadata = map[string]any{}
	}
	return cmd
}
func validateSecurityEvent(cmd RecordSecurityEventCommand) error {
	if cmd.StudentID == "" {
		return errors.New("student_required")
	}
	switch cmd.EventType {
	case "fullscreen_exit", "tab_hidden", "window_blur", "copy_attempt", "paste_attempt", "network_offline", "network_online":
	default:
		return errors.New("invalid_event_type")
	}
	switch cmd.Severity {
	case "info", "warning", "critical":
		return nil
	default:
		return errors.New("invalid_severity")
	}
}
