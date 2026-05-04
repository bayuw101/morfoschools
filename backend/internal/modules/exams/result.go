package exams

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type ResultReceipt struct {
	ReceiptID      string         `json:"receiptId"`
	Status         string         `json:"status"`
	SubmissionKind SubmissionKind `json:"submissionKind"`
	ReceivedAt     time.Time      `json:"receivedAt"`
	Relayed        bool           `json:"relayed"`
}

type ResultGrading struct {
	Status                string          `json:"status"`
	AutoScore             int             `json:"autoScore"`
	ManualScore           int             `json:"manualScore"`
	FinalScore            int             `json:"finalScore"`
	MaxScore              int             `json:"maxScore"`
	RequiresManualGrading bool            `json:"requiresManualGrading"`
	QuestionResults       json.RawMessage `json:"questionResults,omitempty"`
	Feedback              string          `json:"feedback,omitempty"`
	GradedBy              string          `json:"gradedBy,omitempty"`
	GradedAt              time.Time       `json:"gradedAt,omitempty"`
}

type ExamResult struct {
	ExamID    string        `json:"examId"`
	AttemptID string        `json:"attemptId"`
	StudentID string        `json:"studentId"`
	Status    string        `json:"status"`
	Receipt   ResultReceipt `json:"receipt"`
	Grading   ResultGrading `json:"grading"`
	Ready     bool          `json:"ready"`
	Message   string        `json:"message"`
}

type ResultRepository interface {
	FindExamResult(ctx context.Context, tenantID, examID, attemptID string) (ExamResult, bool, error)
}

type ResultHandler struct{ repo ResultRepository }

func NewResultHandler(repo ResultRepository) http.Handler { return ResultHandler{repo: repo} }

func (handler ResultHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}
	examID, attemptID, ok := parseResultPath(strings.TrimSuffix(r.URL.Path, "/"))
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	result, found, err := handler.repo.FindExamResult(r.Context(), tenantID, examID, attemptID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "result_lookup_failed"})
		return
	}
	if !found {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "result_not_found"})
		return
	}
	writeJSON(w, http.StatusOK, normalizeExamResult(result))
}

func parseResultPath(path string) (string, string, bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 7 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[3] != "" && parts[4] == "attempts" && parts[5] != "" && parts[6] == "result" {
		return parts[3], parts[5], true
	}
	return "", "", false
}

func normalizeExamResult(result ExamResult) ExamResult {
	if result.Grading.Status == "completed" {
		result.Ready = true
		if result.Message == "" {
			result.Message = "result_ready"
		}
		return result
	}
	result.Ready = false
	if result.Message == "" {
		if result.Grading.RequiresManualGrading || result.Grading.Status == "waiting_for_grading" {
			result.Message = "waiting_for_manual_grading"
		} else {
			result.Message = "grading_pending"
		}
	}
	return result
}
