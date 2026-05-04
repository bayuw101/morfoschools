package exams

import (
	"net/http"
	"strings"

	"github.com/bayuw101/morfoschools/internal/platform/authctx"
)

type Router struct {
	management    http.Handler
	eligibility   http.Handler
	gate          http.Handler
	manualGrading http.Handler
	result        http.Handler
	monitor       http.Handler
	ingestion     http.Handler
}

func NewRouter(repo PostgresSubmissionRepository) http.Handler {
	return WithPermission(Router{
		management:    NewManagementHandler(repo),
		eligibility:   NewEligibilityHandler(repo),
		gate:          NewGateHandler(repo),
		manualGrading: NewManualGradingHandler(repo),
		result:        NewResultHandler(repo),
		monitor:       NewMonitorHandler(repo),
		ingestion:     NewIngestionHandler(repo),
	})
}

func WithPermission(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		permission := PermissionForPath(r.URL.Path)
		if permission == "" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
			return
		}
		authctx.RequirePermission(permission)(next).ServeHTTP(w, r)
	})
}

func PermissionForPath(path string) authctx.Permission {
	trimmed := strings.TrimSuffix(path, "/")
	if trimmed == "/api/v1/exams" || isManagementResourcePath(trimmed) || isManagementChildPath(trimmed) || isEligibilityPath(trimmed) || isManualGradingPath(trimmed) || isMonitorPath(trimmed) {
		return authctx.ManageExams
	}
	if isGatePath(trimmed) || isIngestionPath(trimmed) {
		return authctx.TakeExams
	}
	if isResultPath(trimmed) {
		return authctx.ViewExamResults
	}
	return ""
}

func (router Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/")
	if path == "/api/v1/exams" || isManagementResourcePath(path) || isManagementChildPath(path) {
		router.management.ServeHTTP(w, r)
		return
	}
	if isEligibilityPath(path) {
		router.eligibility.ServeHTTP(w, r)
		return
	}
	if isGatePath(path) {
		router.gate.ServeHTTP(w, r)
		return
	}
	if isManualGradingPath(path) {
		router.manualGrading.ServeHTTP(w, r)
		return
	}
	if isResultPath(path) {
		router.result.ServeHTTP(w, r)
		return
	}
	if isMonitorPath(path) {
		router.monitor.ServeHTTP(w, r)
		return
	}
	router.ingestion.ServeHTTP(w, r)
}

func isManagementResourcePath(path string) bool {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	return len(parts) == 4 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams"
}

func isManagementChildPath(path string) bool {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 5 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "exams" {
		return false
	}
	switch parts[4] {
	case "questions", "targets", "gate-windows", "prerequisites":
		return true
	default:
		return false
	}
}

func isEligibilityPath(path string) bool {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 5 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[4] == "eligibility" {
		return true
	}
	return len(parts) == 6 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[4] == "eligibility" && parts[5] == "recalculate"
}

func isGatePath(path string) bool {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 6 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[4] == "gate" && parts[5] == "check" {
		return true
	}
	return len(parts) == 7 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[4] == "attempts" && parts[6] == "security-events"
}

func isManualGradingPath(path string) bool {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 5 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[4] == "manual-grading" {
		return true
	}
	return len(parts) == 7 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[4] == "attempts" && parts[6] == "manual-grade"
}

func isResultPath(path string) bool {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	return len(parts) == 7 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[4] == "attempts" && parts[6] == "result"
}

func isMonitorPath(path string) bool {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	return len(parts) == 5 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[4] == "monitor"
}

func isIngestionPath(path string) bool {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	return len(parts) == 7 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" && parts[4] == "attempts" && (parts[6] == "autosave" || parts[6] == "submit")
}
