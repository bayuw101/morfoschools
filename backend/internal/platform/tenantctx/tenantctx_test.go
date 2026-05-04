package tenantctx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMiddlewareStoresTenantIDFromHeader(t *testing.T) {
	var got string
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = FromContext(r.Context())
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tenants", nil)
	req.Header.Set(HeaderName, "tenant-smp-morfosis")
	rec := httptest.NewRecorder()

	Middleware(next).ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected next handler status, got %d", rec.Code)
	}
	if got != "tenant-smp-morfosis" {
		t.Fatalf("expected tenant id from context, got %q", got)
	}
}

func TestRequireRejectsMissingTenantID(t *testing.T) {
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/students", nil)
	rec := httptest.NewRecorder()

	Require(next).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if nextCalled {
		t.Fatal("expected next handler not to be called")
	}
}
