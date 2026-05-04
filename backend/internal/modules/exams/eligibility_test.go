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

type fakeEligibilityRepository struct {
	rows           []ExamEligibilityRow
	capturedTenant string
	capturedExamID string
	result         EligibilityRecalculationResult
	err            error
}

func (repo *fakeEligibilityRepository) ListEligibility(ctx context.Context, tenantID, examID string) ([]ExamEligibilityRow, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	return repo.rows, repo.err
}
func (repo *fakeEligibilityRepository) RecalculateEligibility(ctx context.Context, tenantID, examID string) (EligibilityRecalculationResult, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	if repo.err != nil {
		return EligibilityRecalculationResult{}, repo.err
	}
	return repo.result, nil
}

func TestEligibilityRoutesRequireTenantContext(t *testing.T) {
	handler := NewEligibilityHandler(&fakeEligibilityRepository{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/exams/exam-1/eligibility", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestListEligibilityReturnsMaterializedRows(t *testing.T) {
	repo := &fakeEligibilityRepository{rows: []ExamEligibilityRow{{ExamID: "exam-1", StudentID: "student-1", StudentName: "Budi", EligibilityStatus: "blocked", BlockingReasons: []string{"course_completed:course-1"}}}}
	handler := tenantctx.Middleware(NewEligibilityHandler(repo))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/exams/exam-1/eligibility", nil)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedTenant != "tenant-1" || repo.capturedExamID != "exam-1" {
		t.Fatalf("unexpected capture tenant=%q exam=%q", repo.capturedTenant, repo.capturedExamID)
	}
	var payload struct {
		Data []ExamEligibilityRow `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Data) != 1 || payload.Data[0].EligibilityStatus != "blocked" {
		t.Fatalf("unexpected payload: %+v", payload.Data)
	}
}

func TestRecalculateEligibilityReturnsSummary(t *testing.T) {
	repo := &fakeEligibilityRepository{result: EligibilityRecalculationResult{ExamID: "exam-1", EligibleCount: 12, BlockedCount: 3, TotalCount: 15}}
	handler := tenantctx.Middleware(NewEligibilityHandler(repo))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/eligibility/recalculate", bytes.NewBufferString(`{}`))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedTenant != "tenant-1" || repo.capturedExamID != "exam-1" {
		t.Fatalf("unexpected capture tenant=%q exam=%q", repo.capturedTenant, repo.capturedExamID)
	}
	var payload EligibilityRecalculationResult
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload.TotalCount != 15 || payload.BlockedCount != 3 {
		t.Fatalf("unexpected payload: %+v", payload)
	}
}

func TestEligibilityRejectsInvalidPath(t *testing.T) {
	handler := tenantctx.Middleware(NewEligibilityHandler(&fakeEligibilityRepository{}))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/eligibility/delete", nil)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", rec.Code, rec.Body.String())
	}
}
