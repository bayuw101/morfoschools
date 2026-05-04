package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/cache"
)

// LoginRateLimiter limits repeated login attempts per tenant+email+ip.
// Designed to be backed by Valkey but degrades gracefully through Nop limiter.
type LoginRateLimiter interface {
	Allow(ctx context.Context, tenantID, email, ip string) (bool, error)
}

type cacheLoginRateLimiter struct {
	cache  cache.Cache
	limit  int64
	window time.Duration
}

func NewLoginRateLimiter(c cache.Cache, limit int64, window time.Duration) LoginRateLimiter {
	if c == nil || limit <= 0 || window <= 0 {
		return NewNopLoginRateLimiter()
	}
	return &cacheLoginRateLimiter{cache: c, limit: limit, window: window}
}

func (l *cacheLoginRateLimiter) Allow(ctx context.Context, tenantID, email, ip string) (bool, error) {
	key := loginRateLimitKey(tenantID, email, ip)
	count, err := l.cache.Incr(ctx, key, l.window)
	if err != nil {
		// Fail open: authentication must remain available on low-spec infra if cache degrades.
		return true, nil
	}
	return count <= l.limit, nil
}

func loginRateLimitKey(tenantID, email, ip string) string {
	normalized := strings.ToLower(strings.TrimSpace(tenantID)) + "|" +
		strings.ToLower(strings.TrimSpace(email)) + "|" + strings.TrimSpace(ip)
	sum := sha256.Sum256([]byte(normalized))
	return fmt.Sprintf("rl:login:%s", hex.EncodeToString(sum[:])[:24])
}

type nopLoginRateLimiter struct{}

func NewNopLoginRateLimiter() LoginRateLimiter { return nopLoginRateLimiter{} }

func (nopLoginRateLimiter) Allow(context.Context, string, string, string) (bool, error) {
	return true, nil
}
