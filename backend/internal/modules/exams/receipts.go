package exams

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type ReceiptVerification struct {
	ReceiptID      string         `json:"receiptId"`
	Status         string         `json:"status"`
	Message        string         `json:"message"`
	ExamID         string         `json:"examId"`
	AttemptID      string         `json:"attemptId"`
	StudentID      string         `json:"studentId"`
	SubmissionKind SubmissionKind `json:"submissionKind"`
	ReceivedAt     time.Time      `json:"receivedAt"`
	Relayed        bool           `json:"relayed"`
}

type ReceiptRepository interface {
	FindReceipt(ctx context.Context, tenantID string, receiptID string) (ReceiptVerification, bool, error)
}

type ReceiptHandler struct {
	repo ReceiptRepository
}

func NewReceiptHandler(repo ReceiptRepository) http.Handler {
	return ReceiptHandler{repo: repo}
}

func (handler ReceiptHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}
	receiptID, ok := parseReceiptPath(r.URL.Path)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	receipt, found, err := handler.repo.FindReceipt(r.Context(), tenantID, receiptID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "receipt_lookup_failed"})
		return
	}
	if !found {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "receipt_not_found"})
		return
	}
	writeJSON(w, http.StatusOK, receipt)
}

func parseReceiptPath(path string) (string, bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 4 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "receipts" || parts[3] == "" {
		return "", false
	}
	return parts[3], true
}
