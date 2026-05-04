package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestStrictSessionMiddlewareRejectsMissingToken(t *testing.T) {
	repo := &fakeAuthRepository{}
	handler := StrictSessionMiddleware(repo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/courses", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestStrictSessionMiddlewareRejectsInvalidTokenBeforeDevHeaders(t *testing.T) {
	repo := &fakeAuthRepository{session: nil}
	handler := StrictSessionMiddleware(repo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/courses", nil)
	req.Header.Set("Authorization", "Bearer invalid")
	req.Header.Set("X-User-ID", "forged-user")
	req.Header.Set("X-User-Role", "owner")
	req.Header.Set("X-Tenant-ID", "forged-tenant")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestStrictSessionMiddlewareInjectsValidSessionAndStripsForgedHeaders(t *testing.T) {
	repo := &fakeAuthRepository{session: &Session{
		ID:        "sess-1",
		TenantID:  "tenant-1",
		UserID:    "user-1",
		Token:     "tok_valid",
		Role:      "teacher",
		ExpiresAt: time.Now().Add(time.Hour),
	}}
	var capturedTenant string
	var capturedUser string
	var capturedRole string
	handler := StrictSessionMiddleware(repo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedTenant = r.Header.Get("X-Tenant-ID")
		capturedUser = r.Header.Get("X-User-ID")
		capturedRole = r.Header.Get("X-User-Role")
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/courses", nil)
	req.Header.Set("Authorization", "Bearer tok_valid")
	req.Header.Set("X-User-ID", "forged-user")
	req.Header.Set("X-User-Role", "owner")
	req.Header.Set("X-Tenant-ID", "forged-tenant")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d body=%s", rec.Code, rec.Body.String())
	}
	if capturedTenant != "tenant-1" || capturedUser != "user-1" || capturedRole != "teacher" {
		t.Fatalf("expected session headers, got tenant=%q user=%q role=%q", capturedTenant, capturedUser, capturedRole)
	}
}
