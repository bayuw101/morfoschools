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

type fakeSubmissionRepository struct {
	captured SubmitExamCommand
	result   SubmissionReceipt
	err      error
}

func (repo *fakeSubmissionRepository) StoreSubmission(ctx context.Context, command SubmitExamCommand) (SubmissionReceipt, error) {
	repo.captured = command
	if repo.err != nil {
		return SubmissionReceipt{}, repo.err
	}
	return repo.result, nil
}

func TestSubmitExamRequiresTenantContext(t *testing.T) {
	repo := &fakeSubmissionRepository{}
	handler := NewIngestionHandler(repo)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/attempts/attempt-1/submit", bytes.NewBufferString(`{"studentId":"student-1","answers":[]}`))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestSubmitExamStoresRawPayloadAndReturnsReceipt(t *testing.T) {
	repo := &fakeSubmissionRepository{result: SubmissionReceipt{
		ReceiptID: "receipt-1",
		Status:    "accepted",
		Message:   "submission_received",
	}}
	handler := tenantctx.Middleware(NewIngestionHandler(repo))
	body := bytes.NewBufferString(`{"studentId":"student-1","answers":[{"questionId":"q1","value":"A"}],"clientSubmittedAt":"2026-05-04T03:00:00Z"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/attempts/attempt-1/submit", body)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.captured.TenantID != "tenant-1" || repo.captured.ExamID != "exam-1" || repo.captured.AttemptID != "attempt-1" || repo.captured.StudentID != "student-1" {
		t.Fatalf("unexpected command: %+v", repo.captured)
	}
	if repo.captured.Kind != SubmissionKindFinal {
		t.Fatalf("expected final submit kind, got %q", repo.captured.Kind)
	}
	if len(repo.captured.RawPayload) == 0 {
		t.Fatalf("expected raw payload to be captured")
	}
	var payload SubmissionReceipt
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode receipt response: %v", err)
	}
	if payload.ReceiptID != "receipt-1" || payload.Status != "accepted" {
		t.Fatalf("unexpected receipt payload: %+v", payload)
	}
}

func TestSubmitExamRejectsInvalidPayload(t *testing.T) {
	repo := &fakeSubmissionRepository{}
	handler := tenantctx.Middleware(NewIngestionHandler(repo))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/attempts/attempt-1/submit", bytes.NewBufferString(`{"studentId":""}`))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestAutosaveExamStoresRawPayloadWithAutosaveKind(t *testing.T) {
	repo := &fakeSubmissionRepository{result: SubmissionReceipt{
		ReceiptID: "receipt-autosave-1",
		Status:    "accepted",
		Message:   "autosave_received",
	}}
	handler := tenantctx.Middleware(NewIngestionHandler(repo))
	body := bytes.NewBufferString(`{"studentId":"student-1","answers":[{"questionId":"q1","value":"A"}],"clientSavedAt":"2026-05-04T03:00:00Z"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/attempts/attempt-1/autosave", body)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.captured.Kind != SubmissionKindAutosave {
		t.Fatalf("expected autosave kind, got %q", repo.captured.Kind)
	}
	if repo.captured.TenantID != "tenant-1" || repo.captured.ExamID != "exam-1" || repo.captured.AttemptID != "attempt-1" || repo.captured.StudentID != "student-1" {
		t.Fatalf("unexpected command: %+v", repo.captured)
	}
}
