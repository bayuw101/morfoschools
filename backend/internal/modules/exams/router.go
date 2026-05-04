package exams

import (
	"net/http"
	"strings"
)

type Router struct {
	management    http.Handler
	eligibility   http.Handler
	gate          http.Handler
	manualGrading http.Handler
	ingestion     http.Handler
}

func NewRouter(repo PostgresSubmissionRepository) http.Handler {
	return Router{
		management:    NewManagementHandler(repo),
		eligibility:   NewEligibilityHandler(repo),
		gate:          NewGateHandler(repo),
		manualGrading: NewManualGradingHandler(repo),
		ingestion:     NewIngestionHandler(repo),
	}
}

func (router Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/")
	if path == "/api/v1/exams" || isManagementChildPath(path) {
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
	router.ingestion.ServeHTTP(w, r)
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
