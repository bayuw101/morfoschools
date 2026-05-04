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

type ManualGradingQueueItem struct {
	ExamID                string          `json:"examId"`
	AttemptID             string          `json:"attemptId"`
	StudentID             string          `json:"studentId"`
	ReceiptID             string          `json:"receiptId"`
	AutoScore             int             `json:"autoScore"`
	MaxScore              int             `json:"maxScore"`
	QuestionResults       json.RawMessage `json:"questionResults,omitempty"`
	RequiresManualGrading bool            `json:"requiresManualGrading"`
	GradedAt              time.Time       `json:"gradedAt,omitempty"`
}

type ManualGradeCommand struct {
	ManualScore int    `json:"manualScore"`
	Feedback    string `json:"feedback"`
	GradedBy    string `json:"gradedBy"`
}

type ManualGradeResult struct {
	ExamID      string    `json:"examId"`
	AttemptID   string    `json:"attemptId"`
	StudentID   string    `json:"studentId"`
	ReceiptID   string    `json:"receiptId"`
	Status      string    `json:"status"`
	AutoScore   int       `json:"autoScore"`
	ManualScore int       `json:"manualScore"`
	FinalScore  int       `json:"finalScore"`
	MaxScore    int       `json:"maxScore"`
	Feedback    string    `json:"feedback"`
	GradedBy    string    `json:"gradedBy"`
	GradedAt    time.Time `json:"gradedAt,omitempty"`
}

type ManualGradingRepository interface {
	ListManualGradingQueue(ctx context.Context, tenantID, examID string) ([]ManualGradingQueueItem, error)
	RecordManualGrade(ctx context.Context, tenantID, examID, attemptID string, command ManualGradeCommand) (ManualGradeResult, error)
}

type ManualGradingHandler struct{ repo ManualGradingRepository }

func NewManualGradingHandler(repo ManualGradingRepository) http.Handler {
	return ManualGradingHandler{repo: repo}
}

func (handler ManualGradingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/")
	if examID, ok := parseManualQueuePath(path); ok {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		items, err := handler.repo.ListManualGradingQueue(r.Context(), tenantID, examID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list_manual_grading_failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
		return
	}
	examID, attemptID, ok := parseManualGradePath(path)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}
	var command ManualGradeCommand
	if json.NewDecoder(r.Body).Decode(&command) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	command = normalizeManualGrade(command)
	if err := validateManualGrade(command); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	result, err := handler.repo.RecordManualGrade(r.Context(), tenantID, examID, attemptID, command)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "record_manual_grade_failed"})
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func parseManualQueuePath(path string) (string, bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 5 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[3] != "" && parts[4] == "manual-grading" {
		return parts[3], true
	}
	return "", false
}

func parseManualGradePath(path string) (string, string, bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 7 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[3] != "" && parts[4] == "attempts" && parts[5] != "" && parts[6] == "manual-grade" {
		return parts[3], parts[5], true
	}
	return "", "", false
}

func normalizeManualGrade(command ManualGradeCommand) ManualGradeCommand {
	command.Feedback = strings.TrimSpace(command.Feedback)
	command.GradedBy = strings.TrimSpace(command.GradedBy)
	return command
}

func validateManualGrade(command ManualGradeCommand) error {
	if command.ManualScore < 0 {
		return errors.New("manual_score_invalid")
	}
	if command.GradedBy == "" {
		return errors.New("graded_by_required")
	}
	return nil
}
