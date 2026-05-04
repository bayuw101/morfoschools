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

type fakeReceiptRepository struct {
	capturedTenantID  string
	capturedReceiptID string
	result            ReceiptVerification
	found             bool
	err               error
}

func (repo *fakeReceiptRepository) FindReceipt(ctx context.Context, tenantID string, receiptID string) (ReceiptVerification, bool, error) {
	repo.capturedTenantID = tenantID
	repo.capturedReceiptID = receiptID
	if repo.err != nil {
		return ReceiptVerification{}, false, repo.err
	}
	return repo.result, repo.found, nil
}

func TestReceiptVerificationRequiresTenantContext(t *testing.T) {
	repo := &fakeReceiptRepository{}
	handler := NewReceiptHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/receipts/receipt-1", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestReceiptVerificationReturnsAcceptedReceiptForTenant(t *testing.T) {
	receivedAt := time.Date(2026, 5, 4, 3, 30, 0, 0, time.UTC)
	repo := &fakeReceiptRepository{
		found: true,
		result: ReceiptVerification{
			ReceiptID:      "receipt-1",
			Status:         "accepted",
			Message:        "receipt_verified",
			ExamID:         "exam-1",
			AttemptID:      "attempt-1",
			StudentID:      "student-1",
			SubmissionKind: SubmissionKindFinal,
			ReceivedAt:     receivedAt,
			Relayed:        false,
		},
	}
	handler := tenantctx.Middleware(NewReceiptHandler(repo))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/receipts/receipt-1", nil)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedTenantID != "tenant-1" || repo.capturedReceiptID != "receipt-1" {
		t.Fatalf("unexpected lookup tenant=%q receipt=%q", repo.capturedTenantID, repo.capturedReceiptID)
	}
	var payload ReceiptVerification
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode receipt verification: %v", err)
	}
	if payload.ReceiptID != "receipt-1" || payload.Status != "accepted" || payload.ExamID != "exam-1" || payload.SubmissionKind != SubmissionKindFinal {
		t.Fatalf("unexpected payload: %+v", payload)
	}
	if payload.ReceivedAt != receivedAt {
		t.Fatalf("expected receivedAt %s, got %s", receivedAt, payload.ReceivedAt)
	}
}

func TestReceiptVerificationReturnsNotFoundForOtherTenant(t *testing.T) {
	repo := &fakeReceiptRepository{found: false}
	handler := tenantctx.Middleware(NewReceiptHandler(repo))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/receipts/receipt-1", nil)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestReceiptVerificationRejectsUnsupportedMethod(t *testing.T) {
	repo := &fakeReceiptRepository{}
	handler := tenantctx.Middleware(NewReceiptHandler(repo))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/receipts/receipt-1", nil)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d body=%s", rec.Code, rec.Body.String())
	}
}
