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

type fakeGateRepository struct {
	decision        ExamGateDecision
	event           ExamSecurityEvent
	capturedTenant  string
	capturedExamID  string
	capturedAttempt string
	capturedCheck   ExamGateCheckCommand
	capturedEvent   RecordSecurityEventCommand
	err             error
}

func (repo *fakeGateRepository) CheckGate(ctx context.Context, tenantID, examID string, command ExamGateCheckCommand) (ExamGateDecision, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	repo.capturedCheck = command
	if repo.err != nil {
		return ExamGateDecision{}, repo.err
	}
	return repo.decision, nil
}
func (repo *fakeGateRepository) RecordSecurityEvent(ctx context.Context, tenantID, examID, attemptID string, command RecordSecurityEventCommand) (ExamSecurityEvent, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	repo.capturedAttempt = attemptID
	repo.capturedEvent = command
	if repo.err != nil {
		return ExamSecurityEvent{}, repo.err
	}
	return repo.event, nil
}

func TestGateRoutesRequireTenantContext(t *testing.T) {
	handler := NewGateHandler(&fakeGateRepository{})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/gate/check", bytes.NewBufferString(`{}`))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestGateCheckCapturesStudentPasswordAndReturnsDecision(t *testing.T) {
	repo := &fakeGateRepository{decision: ExamGateDecision{ExamID: "exam-1", StudentID: "student-1", Allowed: true, GateToken: "gate-token", Reasons: []string{}}}
	handler := tenantctx.Middleware(NewGateHandler(repo))
	body := `{"studentId":" student-1 ","password":" rahasia "}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/gate/check", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedTenant != "tenant-1" || repo.capturedExamID != "exam-1" || repo.capturedCheck.StudentID != "student-1" || repo.capturedCheck.Password != "rahasia" {
		t.Fatalf("unexpected capture: %+v", repo)
	}
	var payload ExamGateDecision
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !payload.Allowed || payload.GateToken != "gate-token" {
		t.Fatalf("unexpected payload: %+v", payload)
	}
}

func TestGateCheckRejectsMissingStudent(t *testing.T) {
	handler := tenantctx.Middleware(NewGateHandler(&fakeGateRepository{}))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/gate/check", bytes.NewBufferString(`{"password":"x"}`))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRecordSecurityEventCapturesAttemptAndPayload(t *testing.T) {
	repo := &fakeGateRepository{event: ExamSecurityEvent{ID: "event-1", ExamID: "exam-1", AttemptID: "attempt-1", StudentID: "student-1", EventType: "fullscreen_exit", Severity: "warning"}}
	handler := tenantctx.Middleware(NewGateHandler(repo))
	body := `{"studentId":"student-1","eventType":" Fullscreen_Exit ","severity":" Warning ","metadata":{"count":1}}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/attempts/attempt-1/security-events", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedAttempt != "attempt-1" || repo.capturedEvent.EventType != "fullscreen_exit" || repo.capturedEvent.Severity != "warning" || repo.capturedEvent.Metadata["count"].(float64) != 1 {
		t.Fatalf("unexpected capture: %+v", repo.capturedEvent)
	}
}

func TestRecordSecurityEventRejectsInvalidType(t *testing.T) {
	handler := tenantctx.Middleware(NewGateHandler(&fakeGateRepository{}))
	body := `{"studentId":"student-1","eventType":"smile","severity":"info"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/attempts/attempt-1/security-events", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}
