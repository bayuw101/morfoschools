package exams

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type MonitorSummary struct {
	EligibleStudents          int `json:"eligibleStudents"`
	BlockedStudents           int `json:"blockedStudents"`
	StartedAttempts           int `json:"startedAttempts"`
	SubmittedAttempts         int `json:"submittedAttempts"`
	WaitingForGradingAttempts int `json:"waitingForGradingAttempts"`
	CompletedAttempts         int `json:"completedAttempts"`
	UnrelayedSubmissions      int `json:"unrelayedSubmissions"`
	OldestUnrelayedSeconds    int `json:"oldestUnrelayedSeconds"`
	SecurityWarningEvents     int `json:"securityWarningEvents"`
	SecurityCriticalEvents    int `json:"securityCriticalEvents"`
}

type MonitorReceipt struct {
	ReceiptID      string         `json:"receiptId"`
	AttemptID      string         `json:"attemptId"`
	StudentID      string         `json:"studentId"`
	SubmissionKind SubmissionKind `json:"submissionKind"`
	ReceivedAt     time.Time      `json:"receivedAt"`
	Relayed        bool           `json:"relayed"`
}

type ExamMonitor struct {
	ExamID         string              `json:"examId"`
	Summary        MonitorSummary      `json:"summary"`
	LatestReceipts []MonitorReceipt    `json:"latestReceipts"`
	SecurityEvents []ExamSecurityEvent `json:"securityEvents"`
	GeneratedAt    time.Time           `json:"generatedAt"`
}

type MonitorRepository interface {
	GetExamMonitor(ctx context.Context, tenantID, examID string) (ExamMonitor, error)
}

type MonitorHandler struct{ repo MonitorRepository }

func NewMonitorHandler(repo MonitorRepository) http.Handler { return MonitorHandler{repo: repo} }

func (handler MonitorHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}
	examID, ok := parseMonitorPath(strings.TrimSuffix(r.URL.Path, "/"))
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	monitor, err := handler.repo.GetExamMonitor(r.Context(), tenantID, examID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "monitor_lookup_failed"})
		return
	}
	if monitor.ExamID == "" {
		monitor.ExamID = examID
	}
	if monitor.GeneratedAt.IsZero() {
		monitor.GeneratedAt = time.Now().UTC()
	}
	writeJSON(w, http.StatusOK, monitor)
}

func parseMonitorPath(path string) (string, bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 5 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[3] != "" && parts[4] == "monitor" {
		return parts[3], true
	}
	return "", false
}
