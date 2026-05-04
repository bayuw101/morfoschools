package exams

import (
	"net/http"
	"strings"
)

type Router struct {
	management http.Handler
	ingestion  http.Handler
}

func NewRouter(repo PostgresSubmissionRepository) http.Handler {
	return Router{
		management: NewManagementHandler(repo),
		ingestion:  NewIngestionHandler(repo),
	}
}

func (router Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/")
	if path == "/api/v1/exams" || isManagementChildPath(path) {
		router.management.ServeHTTP(w, r)
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
