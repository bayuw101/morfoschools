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

type fakeResultRepository struct {
	tenantID  string
	examID    string
	attemptID string
	result    ExamResult
	found     bool
}

func (repo *fakeResultRepository) FindExamResult(ctx context.Context, tenantID, examID, attemptID string) (ExamResult, bool, error) {
	repo.tenantID = tenantID
	repo.examID = examID
	repo.attemptID = attemptID
	return repo.result, repo.found, nil
}

func TestResultHandlerRequiresTenant(t *testing.T) {
	handler := NewResultHandler(&fakeResultRepository{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/exams/exam-1/attempts/attempt-1/result", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestResultHandlerReturnsPendingReceiptWhenNotGraded(t *testing.T) {
	receivedAt := time.Date(2026, 5, 4, 10, 0, 0, 0, time.UTC)
	repo := &fakeResultRepository{found: true, result: ExamResult{
		ExamID: "exam-1", AttemptID: "attempt-1", StudentID: "student-1", Status: "waiting_for_grading",
		Receipt: ResultReceipt{ReceiptID: "receipt-1", Status: "accepted", SubmissionKind: SubmissionKindFinal, ReceivedAt: receivedAt, Relayed: true},
		Grading: ResultGrading{Status: "waiting_for_grading", AutoScore: 5, ManualScore: 0, FinalScore: 5, MaxScore: 10, RequiresManualGrading: true, QuestionResults: json.RawMessage(`[]`)},
	}}
	handler := NewResultHandler(repo)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/exams/exam-1/attempts/attempt-1/result", nil)
	request.Header.Set(tenantctx.HeaderName, "tenant-1")

	tenantctx.Middleware(handler).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if repo.tenantID != "tenant-1" || repo.examID != "exam-1" || repo.attemptID != "attempt-1" {
		t.Fatalf("unexpected lookup: tenant=%q exam=%q attempt=%q", repo.tenantID, repo.examID, repo.attemptID)
	}
	var response ExamResult
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.Receipt.ReceiptID != "receipt-1" || response.Grading.Status != "waiting_for_grading" || !response.Grading.RequiresManualGrading {
		t.Fatalf("unexpected result: %+v", response)
	}
}

func TestResultHandlerReturnsNotFound(t *testing.T) {
	handler := NewResultHandler(&fakeResultRepository{found: false})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/exams/exam-1/attempts/attempt-1/result", nil)
	request.Header.Set(tenantctx.HeaderName, "tenant-1")

	tenantctx.Middleware(handler).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
