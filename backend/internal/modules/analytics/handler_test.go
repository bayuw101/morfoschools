package analytics

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type mockReader struct {
	stats ExamStats
	err   error
}

func (m *mockReader) GetExamStats(ctx context.Context, tenantID, examID string) (ExamStats, error) {
	return m.stats, m.err
}

func TestGetExamAnalyticsSuccess(t *testing.T) {
	h := &Handler{
		Reader: &mockReader{
			stats: ExamStats{TotalEvents: 100, UniqueStudents: 20, LastReceived: "2026-05-04"},
		},
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/exams/ex-1/analytics", nil)
	req.Header.Set("X-Tenant-ID", "ten-1")
	req.SetPathValue("examId", "ex-1")

	w := httptest.NewRecorder()
	h.GetExamAnalytics(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", w.Code, http.StatusOK)
	}

	if !strings.Contains(w.Body.String(), `"totalEvents":100`) {
		t.Errorf("got %s", w.Body.String())
	}
}
