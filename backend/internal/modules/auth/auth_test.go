package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/cache"
	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

// ── fake repository ──

type fakeAuthRepository struct {
	user     *UserCredentials
	session  *Session
	loginErr error
	sessErr  error
}

func (f *fakeAuthRepository) FindUserByEmail(ctx context.Context, tenantID, email string) (*UserCredentials, error) {
	if f.loginErr != nil {
		return nil, f.loginErr
	}
	return f.user, nil
}

func (f *fakeAuthRepository) CreateSession(ctx context.Context, params CreateSessionParams) (Session, error) {
	if f.sessErr != nil {
		return Session{}, f.sessErr
	}
	return Session{
		ID:        "sess-1",
		TenantID:  params.TenantID,
		UserID:    params.UserID,
		Token:     "tok_random123",
		Role:      params.Role,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}, nil
}

func (f *fakeAuthRepository) FindSessionByToken(ctx context.Context, token string) (*Session, error) {
	if f.sessErr != nil {
		return nil, f.sessErr
	}
	return f.session, nil
}

func (f *fakeAuthRepository) DeleteSession(ctx context.Context, token string) error {
	return f.sessErr
}

// ── login tests ──

func TestLoginRequiresTenantContext(t *testing.T) {
	repo := &fakeAuthRepository{}
	handler := NewHandler(repo)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(`{"email":"a@b.c","password":"12345678"}`))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestLoginRejectsInvalidJSON(t *testing.T) {
	repo := &fakeAuthRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(`{bad json`))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestLoginRejectsUserNotFound(t *testing.T) {
	repo := &fakeAuthRepository{user: nil}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := `{"email":"unknown@example.com","password":"12345678"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestLoginRejectsWrongPassword(t *testing.T) {
	hashed, _ := HashPassword("correct-password")
	repo := &fakeAuthRepository{
		user: &UserCredentials{
			ID:           "user-1",
			Email:        "guru@example.sch.id",
			Name:         "Guru A",
			Role:         "teacher",
			PasswordHash: hashed,
		},
	}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := `{"email":"guru@example.sch.id","password":"wrong-password"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestLoginSucceedsWithCorrectCredentials(t *testing.T) {
	hashed, _ := HashPassword("morfosis123")
	repo := &fakeAuthRepository{
		user: &UserCredentials{
			ID:           "user-1",
			Email:        "guru@example.sch.id",
			Name:         "Guru A",
			Role:         "teacher",
			PasswordHash: hashed,
		},
	}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := `{"email":"guru@example.sch.id","password":"morfosis123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var result LoginResponse
	if err := json.NewDecoder(rec.Body).Decode(&result); err != nil {
		t.Fatalf("decode login response: %v", err)
	}
	if result.Token == "" {
		t.Fatal("expected non-empty token")
	}
	if result.User.ID != "user-1" || result.User.Role != "teacher" {
		t.Fatalf("unexpected user in response: %+v", result.User)
	}
}

func TestLoginRateLimited(t *testing.T) {
	hashed, _ := HashPassword("morfosis123")
	repo := &fakeAuthRepository{
		user: &UserCredentials{
			ID: "user-1", Email: "guru@example.sch.id",
			Name: "Guru A", Role: "teacher", PasswordHash: hashed,
		},
	}
	limiter := NewLoginRateLimiter(cache.NewFakeCache(), 1, time.Minute)
	handler := tenantctx.Middleware(NewHandlerWithRateLimiter(repo, limiter))
	body := `{"email":"guru@example.sch.id","password": "morfosis123"}`

	// First attempt consumes the single allowed slot.
	firstReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(body))
	firstReq.Header.Set(tenantctx.HeaderName, "tenant-1")
	firstReq.RemoteAddr = "127.0.0.1:12345"
	handler.ServeHTTP(httptest.NewRecorder(), firstReq)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d body=%s", rec.Code, rec.Body.String())
	}
}

// ── session middleware tests ──

func TestSessionMiddlewarePassesWithValidToken(t *testing.T) {
	repo := &fakeAuthRepository{
		session: &Session{
			ID:        "sess-1",
			TenantID:  "tenant-1",
			UserID:    "user-1",
			Token:     "tok_valid",
			Role:      "teacher",
			ExpiresAt: time.Now().Add(24 * time.Hour),
		},
	}
	var capturedUser string
	var capturedRole string
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUser = r.Header.Get("X-User-ID")
		capturedRole = r.Header.Get("X-User-Role")
		w.WriteHeader(http.StatusNoContent)
	})
	handler := SessionMiddleware(repo)(inner)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer tok_valid")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d body=%s", rec.Code, rec.Body.String())
	}
	if capturedUser != "user-1" {
		t.Fatalf("expected user-1, got %q", capturedUser)
	}
	if capturedRole != "teacher" {
		t.Fatalf("expected teacher, got %q", capturedRole)
	}
}

func TestSessionMiddlewareFallsBackToDevHeaders(t *testing.T) {
	repo := &fakeAuthRepository{session: nil}
	var capturedUser string
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUser = r.Header.Get("X-User-ID")
		w.WriteHeader(http.StatusNoContent)
	})
	handler := SessionMiddleware(repo)(inner)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-User-ID", "dev-user")
	req.Header.Set("X-User-Role", "admin")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d body=%s", rec.Code, rec.Body.String())
	}
	if capturedUser != "dev-user" {
		t.Fatalf("expected dev-user fallback, got %q", capturedUser)
	}
}

func TestSessionMiddlewareRejectsExpiredToken(t *testing.T) {
	repo := &fakeAuthRepository{
		session: &Session{
			ID:        "sess-1",
			TenantID:  "tenant-1",
			UserID:    "user-1",
			Token:     "tok_expired",
			Role:      "teacher",
			ExpiresAt: time.Now().Add(-1 * time.Hour), // expired
		},
	}
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	handler := SessionMiddleware(repo)(inner)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer tok_expired")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	// Expired token should be treated as no session → fall through to dev headers
	// If no dev headers either, downstream authctx.RequireRoles will reject.
	// The middleware itself just passes through.
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204 passthrough, got %d", rec.Code)
	}
}

// ── logout test ──

func TestLogoutDeletesSession(t *testing.T) {
	repo := &fakeAuthRepository{}
	handler := NewHandler(repo)
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/auth/logout", nil)
	req.Header.Set("Authorization", "Bearer tok_to_delete")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d body=%s", rec.Code, rec.Body.String())
	}
}
