package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProtectedSessionMiddlewareAllowsPublicPathsWithoutToken(t *testing.T) {
	handler := ProtectedSessionMiddleware(&fakeAuthRepository{}, []string{"/api/v1/auth/"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected public auth path to pass, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestProtectedSessionMiddlewareRequiresTokenForProtectedPaths(t *testing.T) {
	handler := ProtectedSessionMiddleware(&fakeAuthRepository{}, []string{"/api/v1/auth/"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/courses", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected protected path 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}
