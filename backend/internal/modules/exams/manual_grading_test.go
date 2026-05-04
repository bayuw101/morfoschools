package exams

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type fakeManualGradingRepository struct {
	queue        []ManualGradingQueueItem
	listedExamID string
	command      ManualGradeCommand
	result       ManualGradeResult
}

func (repo *fakeManualGradingRepository) ListManualGradingQueue(ctx context.Context, tenantID, examID string) ([]ManualGradingQueueItem, error) {
	repo.listedExamID = examID
	return repo.queue, nil
}

func (repo *fakeManualGradingRepository) RecordManualGrade(ctx context.Context, tenantID, examID, attemptID string, command ManualGradeCommand) (ManualGradeResult, error) {
	repo.command = command
	if repo.result.AttemptID == "" {
		repo.result = ManualGradeResult{ExamID: examID, AttemptID: attemptID, Status: "completed", FinalScore: command.ManualScore}
	}
	return repo.result, nil
}

func TestManualGradingHandlerRequiresTenant(t *testing.T) {
	handler := NewManualGradingHandler(&fakeManualGradingRepository{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/exams/exam-1/manual-grading", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestManualGradingHandlerListsQueue(t *testing.T) {
	repo := &fakeManualGradingRepository{queue: []ManualGradingQueueItem{{AttemptID: "attempt-1", StudentID: "student-1", AutoScore: 3, MaxScore: 10}}}
	handler := NewManualGradingHandler(repo)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/exams/exam-1/manual-grading", nil)
	request.Header.Set(tenantctx.HeaderName, "tenant-1")

	tenantctx.Middleware(handler).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if repo.listedExamID != "exam-1" {
		t.Fatalf("expected exam-1, got %q", repo.listedExamID)
	}
	var response struct {
		Items []ManualGradingQueueItem `json:"items"`
	}
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(response.Items) != 1 || response.Items[0].AttemptID != "attempt-1" {
		t.Fatalf("unexpected response: %+v", response)
	}
}

func TestManualGradingHandlerRecordsManualGrade(t *testing.T) {
	repo := &fakeManualGradingRepository{}
	handler := NewManualGradingHandler(repo)
	payload := []byte(`{"manualScore":7,"feedback":"Argumentasi baik","gradedBy":"teacher-1"}`)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/attempts/attempt-1/manual-grade", bytes.NewReader(payload))
	request.Header.Set(tenantctx.HeaderName, "tenant-1")

	tenantctx.Middleware(handler).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if repo.command.ManualScore != 7 || repo.command.GradedBy != "teacher-1" {
		t.Fatalf("unexpected command: %+v", repo.command)
	}
	var result ManualGradeResult
	if err := json.NewDecoder(recorder.Body).Decode(&result); err != nil {
		t.Fatalf("decode result: %v", err)
	}
	if result.Status != "completed" || result.FinalScore != 7 {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestManualGradingHandlerRejectsInvalidManualScore(t *testing.T) {
	handler := NewManualGradingHandler(&fakeManualGradingRepository{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/attempts/attempt-1/manual-grade", bytes.NewReader([]byte(`{"manualScore":-1,"gradedBy":"teacher-1"}`)))
	request.Header.Set(tenantctx.HeaderName, "tenant-1")

	tenantctx.Middleware(handler).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
