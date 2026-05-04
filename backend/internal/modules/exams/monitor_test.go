package exams

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type fakeMonitorRepository struct {
	tenantID string
	examID   string
	monitor  ExamMonitor
}

func (repo *fakeMonitorRepository) GetExamMonitor(ctx context.Context, tenantID, examID string) (ExamMonitor, error) {
	repo.tenantID = tenantID
	repo.examID = examID
	return repo.monitor, nil
}

func TestMonitorHandlerRequiresTenant(t *testing.T) {
	handler := NewMonitorHandler(&fakeMonitorRepository{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/exams/exam-1/monitor", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestMonitorHandlerReturnsSummaryReceiptsAndSecurityEvents(t *testing.T) {
	now := time.Date(2026, 5, 4, 11, 0, 0, 0, time.UTC)
	repo := &fakeMonitorRepository{monitor: ExamMonitor{
		ExamID:         "exam-1",
		Summary:        MonitorSummary{EligibleStudents: 32, StartedAttempts: 12, SubmittedAttempts: 4, WaitingForGradingAttempts: 2, CompletedAttempts: 6, UnrelayedSubmissions: 1, OldestUnrelayedSeconds: 7},
		LatestReceipts: []MonitorReceipt{{ReceiptID: "receipt-1", AttemptID: "attempt-1", StudentID: "student-1", SubmissionKind: SubmissionKindFinal, ReceivedAt: now, Relayed: true}},
		SecurityEvents: []ExamSecurityEvent{{ID: "1", ExamID: "exam-1", AttemptID: "attempt-1", StudentID: "student-1", EventType: "fullscreen_exit", Severity: "warning", OccurredAt: now}},
	}}
	handler := NewMonitorHandler(repo)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/exams/exam-1/monitor", nil)
	request.Header.Set(tenantctx.HeaderName, "tenant-1")

	tenantctx.Middleware(handler).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if repo.tenantID != "tenant-1" || repo.examID != "exam-1" {
		t.Fatalf("unexpected lookup: tenant=%q exam=%q", repo.tenantID, repo.examID)
	}
	var response ExamMonitor
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.Summary.EligibleStudents != 32 || response.Summary.UnrelayedSubmissions != 1 || len(response.LatestReceipts) != 1 || len(response.SecurityEvents) != 1 {
		t.Fatalf("unexpected monitor response: %+v", response)
	}
}

func TestMonitorHandlerRejectsWrongMethod(t *testing.T) {
	handler := NewMonitorHandler(&fakeMonitorRepository{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/monitor", nil)
	request.Header.Set(tenantctx.HeaderName, "tenant-1")

	tenantctx.Middleware(handler).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
