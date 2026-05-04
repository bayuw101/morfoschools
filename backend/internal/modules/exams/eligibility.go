package exams

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type ExamEligibilityRow struct {
	ExamID            string    `json:"examId"`
	StudentID         string    `json:"studentId"`
	StudentName       string    `json:"studentName"`
	EligibilityStatus string    `json:"eligibilityStatus"`
	BlockingReasons   []string  `json:"blockingReasons"`
	CalculatedAt      time.Time `json:"calculatedAt"`
}

type EligibilityRecalculationResult struct {
	ExamID        string `json:"examId"`
	EligibleCount int    `json:"eligibleCount"`
	BlockedCount  int    `json:"blockedCount"`
	TotalCount    int    `json:"totalCount"`
}

type EligibilityRepository interface {
	ListEligibility(ctx context.Context, tenantID, examID string) ([]ExamEligibilityRow, error)
	RecalculateEligibility(ctx context.Context, tenantID, examID string) (EligibilityRecalculationResult, error)
}

type EligibilityHandler struct{ repo EligibilityRepository }

func NewEligibilityHandler(repo EligibilityRepository) http.Handler {
	return EligibilityHandler{repo: repo}
}

func (h EligibilityHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	examID, action, ok := parseEligibilityPath(strings.TrimSuffix(r.URL.Path, "/"))
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	if action == "list" {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		items, err := h.repo.ListEligibility(r.Context(), tenantID, examID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list_eligibility_failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string][]ExamEligibilityRow{"data": items})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}
	result, err := h.repo.RecalculateEligibility(r.Context(), tenantID, examID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "recalculate_eligibility_failed"})
		return
	}
	writeJSON(w, http.StatusAccepted, result)
}

func parseEligibilityPath(path string) (examID string, action string, ok bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 5 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[3] != "" && parts[4] == "eligibility" {
		return parts[3], "list", true
	}
	if len(parts) == 6 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[3] != "" && parts[4] == "eligibility" && parts[5] == "recalculate" {
		return parts[3], "recalculate", true
	}
	return "", "", false
}
