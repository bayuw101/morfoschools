package exams

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bayuw101/morfoschools/internal/platform/authctx"
)

func TestExamRouterPermissionForPath(t *testing.T) {
	cases := []struct {
		path string
		want authctx.Permission
	}{
		{"/api/v1/exams", authctx.ManageExams},
		{"/api/v1/exams/exam-1", authctx.ManageExams},
		{"/api/v1/exams/exam-1/questions", authctx.ManageExams},
		{"/api/v1/exams/exam-1/targets", authctx.ManageExams},
		{"/api/v1/exams/exam-1/gate-windows", authctx.ManageExams},
		{"/api/v1/exams/exam-1/prerequisites", authctx.ManageExams},
		{"/api/v1/exams/exam-1/eligibility", authctx.ManageExams},
		{"/api/v1/exams/exam-1/eligibility/recalculate", authctx.ManageExams},
		{"/api/v1/exams/exam-1/monitor", authctx.ManageExams},
		{"/api/v1/exams/exam-1/manual-grading", authctx.ManageExams},
		{"/api/v1/exams/exam-1/attempts/attempt-1/manual-grade", authctx.ManageExams},
		{"/api/v1/exams/exam-1/gate/check", authctx.TakeExams},
		{"/api/v1/exams/exam-1/attempts/attempt-1/autosave", authctx.TakeExams},
		{"/api/v1/exams/exam-1/attempts/attempt-1/submit", authctx.TakeExams},
		{"/api/v1/exams/exam-1/attempts/attempt-1/security-events", authctx.TakeExams},
		{"/api/v1/exams/exam-1/attempts/attempt-1/result", authctx.ViewExamResults},
	}

	for _, tt := range cases {
		if got := PermissionForPath(tt.path); got != tt.want {
			t.Fatalf("PermissionForPath(%q)=%q want %q", tt.path, got, tt.want)
		}
	}
}

func TestWithPermissionRejectsStudentFromManagementPath(t *testing.T) {
	handler := authctx.Middleware(WithPermission(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/exams", nil)
	req.Header.Set(authctx.UserIDHeader, "student-1")
	req.Header.Set(authctx.UserRoleHeader, "student")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected forbidden, got %d", rec.Code)
	}
}

func TestWithPermissionAllowsStudentExamTakingPath(t *testing.T) {
	handler := authctx.Middleware(WithPermission(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/attempts/attempt-1/submit", nil)
	req.Header.Set(authctx.UserIDHeader, "student-1")
	req.Header.Set(authctx.UserRoleHeader, "student")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected no content, got %d", rec.Code)
	}
}
