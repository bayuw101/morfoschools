package auth

import (
	"context"
	"testing"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/cache"
)

// ── fakeRepo: map-backed fake for cached repository tests ──

type fakeRepo struct {
	sessions map[string]*Session
}

func (f *fakeRepo) FindUserByEmail(_ context.Context, _, _ string) (*UserCredentials, error) {
	return nil, nil
}

func (f *fakeRepo) CreateSession(_ context.Context, params CreateSessionParams) (Session, error) {
	sess := Session{
		ID:        "gen-" + params.Token,
		TenantID:  params.TenantID,
		UserID:    params.UserID,
		Token:     params.Token,
		Role:      params.Role,
		ExpiresAt: time.Now().Add(params.Duration),
	}
	f.sessions[params.Token] = &sess
	return sess, nil
}

func (f *fakeRepo) FindSessionByToken(_ context.Context, token string) (*Session, error) {
	return f.sessions[token], nil
}

func (f *fakeRepo) DeleteSession(_ context.Context, token string) error {
	delete(f.sessions, token)
	return nil
}

// ── Cached Repository Tests ──

func TestCachedRepo_FindSessionByToken_CacheMiss_FallsBackToInner(t *testing.T) {
	inner := &fakeRepo{
		sessions: map[string]*Session{
			"tok_abc": {
				ID: "s1", TenantID: "t1", UserID: "u1",
				Token: "tok_abc", Role: "student",
				ExpiresAt: time.Now().Add(time.Hour),
			},
		},
	}
	fc := cache.NewFakeCache()
	repo := NewCachedRepository(inner, fc)

	sess, err := repo.FindSessionByToken(context.Background(), "tok_abc")
	if err != nil {
		t.Fatalf("find: %v", err)
	}
	if sess == nil || sess.UserID != "u1" {
		t.Fatalf("expected session with user u1, got %+v", sess)
	}

	// Second call should come from cache (verify by removing from inner)
	delete(inner.sessions, "tok_abc")
	sess2, err := repo.FindSessionByToken(context.Background(), "tok_abc")
	if err != nil {
		t.Fatalf("find cached: %v", err)
	}
	if sess2 == nil || sess2.UserID != "u1" {
		t.Fatalf("expected cached session, got %+v", sess2)
	}
}

func TestCachedRepo_DeleteSession_InvalidatesCache(t *testing.T) {
	inner := &fakeRepo{
		sessions: map[string]*Session{
			"tok_del": {
				ID: "s2", TenantID: "t1", UserID: "u2",
				Token: "tok_del", Role: "teacher",
				ExpiresAt: time.Now().Add(time.Hour),
			},
		},
	}
	fc := cache.NewFakeCache()
	repo := NewCachedRepository(inner, fc)

	// Populate cache
	_, _ = repo.FindSessionByToken(context.Background(), "tok_del")

	// Delete should clear both inner and cache
	if err := repo.DeleteSession(context.Background(), "tok_del"); err != nil {
		t.Fatalf("delete: %v", err)
	}

	sess, _ := repo.FindSessionByToken(context.Background(), "tok_del")
	if sess != nil {
		t.Fatalf("expected nil after delete, got %+v", sess)
	}
}

func TestCachedRepo_CreateSession_PassthroughToInner(t *testing.T) {
	inner := &fakeRepo{sessions: map[string]*Session{}}
	fc := cache.NewFakeCache()
	repo := NewCachedRepository(inner, fc)

	sess, err := repo.CreateSession(context.Background(), CreateSessionParams{
		TenantID: "t1", UserID: "u3", Role: "admin",
		Token: "tok_new", Duration: time.Hour,
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if sess.Token != "tok_new" {
		t.Fatalf("expected tok_new, got %s", sess.Token)
	}
}
