package authctx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMiddlewareStoresUserIdentityFromHeaders(t *testing.T) {
	var captured User
	handler := Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = FromContext(r.Context())
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(UserIDHeader, "user-1")
	req.Header.Set(UserRoleHeader, "teacher")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
	if captured.ID != "user-1" || captured.Role != "teacher" {
		t.Fatalf("unexpected captured auth user: %+v", captured)
	}
}

func TestRequireRolesAllowsMatchingRole(t *testing.T) {
	handler := Middleware(RequireRoles("admin", "teacher")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(UserIDHeader, "user-1")
	req.Header.Set(UserRoleHeader, "teacher")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRequireRolesRejectsMissingUser(t *testing.T) {
	handler := Middleware(RequireRoles("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRequireRolesRejectsWrongRole(t *testing.T) {
	handler := Middleware(RequireRoles("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(UserIDHeader, "user-1")
	req.Header.Set(UserRoleHeader, "student")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRequirePermissionAllowsAuthorizedRole(t *testing.T) {
	handler := Middleware(RequirePermission(ManageClasses)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(UserIDHeader, "user-1")
	req.Header.Set(UserRoleHeader, "admin")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRequirePermissionRejectsUnauthorizedRole(t *testing.T) {
	handler := Middleware(RequirePermission(ManageUsers)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(UserIDHeader, "user-1")
	req.Header.Set(UserRoleHeader, "teacher")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", rec.Code, rec.Body.String())
	}
}
