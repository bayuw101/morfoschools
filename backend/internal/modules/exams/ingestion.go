package exams

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type SubmitExamCommand struct {
	TenantID   string
	ExamID     string
	AttemptID  string
	StudentID  string
	RawPayload []byte
}

type SubmissionReceipt struct {
	ReceiptID string `json:"receiptId"`
	Status    string `json:"status"`
	Message   string `json:"message"`
}

type SubmissionRepository interface {
	StoreSubmission(context.Context, SubmitExamCommand) (SubmissionReceipt, error)
}

type IngestionHandler struct {
	repo SubmissionRepository
}

func NewIngestionHandler(repo SubmissionRepository) http.Handler {
	return IngestionHandler{repo: repo}
}

func (handler IngestionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}
	examID, attemptID, ok := parseSubmitPath(r.URL.Path)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	rawPayload, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload_too_large"})
		return
	}
	studentID, err := extractStudentID(rawPayload)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	receipt, err := handler.repo.StoreSubmission(r.Context(), SubmitExamCommand{
		TenantID:   tenantID,
		ExamID:     examID,
		AttemptID:  attemptID,
		StudentID:  studentID,
		RawPayload: rawPayload,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "store_submission_failed"})
		return
	}
	writeJSON(w, http.StatusAccepted, receipt)
}

func parseSubmitPath(path string) (examID string, attemptID string, ok bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 7 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "exams" || parts[4] != "attempts" || parts[6] != "submit" {
		return "", "", false
	}
	if parts[3] == "" || parts[5] == "" {
		return "", "", false
	}
	return parts[3], parts[5], true
}

func extractStudentID(rawPayload []byte) (string, error) {
	var payload struct {
		StudentID string `json:"studentId"`
		Answers   []any  `json:"answers"`
	}
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		return "", errors.New("invalid_json")
	}
	studentID := strings.TrimSpace(payload.StudentID)
	if studentID == "" {
		return "", errors.New("student_id_required")
	}
	return studentID, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
