package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/cache"
)

// CachedRepository wraps an auth Repository with a cache layer.
// Session lookups are cached in Valkey for fast middleware resolution.
// Cache misses fall through to the inner (Postgres) repository.
const sessionCachePrefix = "sess:"
const sessionCacheTTL = 30 * time.Minute

type CachedRepository struct {
	inner Repository
	cache cache.Cache
}

func NewCachedRepository(inner Repository, c cache.Cache) Repository {
	return &CachedRepository{inner: inner, cache: c}
}

func (cr *CachedRepository) FindUserByEmail(ctx context.Context, tenantID, email string) (*UserCredentials, error) {
	// User lookup is rare (only at login), no cache needed
	return cr.inner.FindUserByEmail(ctx, tenantID, email)
}

func (cr *CachedRepository) CreateSession(ctx context.Context, params CreateSessionParams) (Session, error) {
	sess, err := cr.inner.CreateSession(ctx, params)
	if err != nil {
		return sess, err
	}
	// Pre-warm cache
	cr.cacheSession(ctx, &sess)
	return sess, nil
}

func (cr *CachedRepository) FindSessionByToken(ctx context.Context, token string) (*Session, error) {
	key := sessionCachePrefix + token

	// Try cache first
	raw, err := cr.cache.Get(ctx, key)
	if err == nil && raw != "" {
		var sess Session
		if json.Unmarshal([]byte(raw), &sess) == nil {
			return &sess, nil
		}
	}

	// Cache miss → inner
	sess, err := cr.inner.FindSessionByToken(ctx, token)
	if err != nil {
		return nil, err
	}
	if sess != nil {
		cr.cacheSession(ctx, sess)
	}
	return sess, nil
}

func (cr *CachedRepository) DeleteSession(ctx context.Context, token string) error {
	key := sessionCachePrefix + token
	_ = cr.cache.Del(ctx, key)
	return cr.inner.DeleteSession(ctx, token)
}

func (cr *CachedRepository) cacheSession(ctx context.Context, sess *Session) {
	data, err := json.Marshal(sess)
	if err != nil {
		return
	}
	ttl := sessionCacheTTL
	remaining := time.Until(sess.ExpiresAt)
	if remaining < ttl {
		ttl = remaining
	}
	if ttl <= 0 {
		return
	}
	_ = cr.cache.Set(ctx, fmt.Sprintf("%s%s", sessionCachePrefix, sess.Token), string(data), ttl)
}
