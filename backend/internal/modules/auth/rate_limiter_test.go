package auth

import (
	"context"
	"testing"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/cache"
)

func TestLoginRateLimiter_AllowsWithinLimit(t *testing.T) {
	limiter := NewLoginRateLimiter(cache.NewFakeCache(), 3, time.Minute)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		allowed, err := limiter.Allow(ctx, "tenant-1", "admin@example.sch.id", "127.0.0.1")
		if err != nil {
			t.Fatalf("allow: %v", err)
		}
		if !allowed {
			t.Fatalf("attempt %d should be allowed", i+1)
		}
	}
}

func TestLoginRateLimiter_BlocksAfterLimit(t *testing.T) {
	limiter := NewLoginRateLimiter(cache.NewFakeCache(), 2, time.Minute)
	ctx := context.Background()

	for i := 0; i < 2; i++ {
		allowed, _ := limiter.Allow(ctx, "tenant-1", "admin@example.sch.id", "127.0.0.1")
		if !allowed {
			t.Fatalf("attempt %d should be allowed", i+1)
		}
	}

	allowed, err := limiter.Allow(ctx, "tenant-1", "admin@example.sch.id", "127.0.0.1")
	if err != nil {
		t.Fatalf("allow blocked: %v", err)
	}
	if allowed {
		t.Fatal("third attempt should be blocked")
	}
}

func TestLoginRateLimiter_IsTenantScoped(t *testing.T) {
	c := cache.NewFakeCache()
	limiter := NewLoginRateLimiter(c, 1, time.Minute)
	ctx := context.Background()

	allowed, _ := limiter.Allow(ctx, "tenant-1", "admin@example.sch.id", "127.0.0.1")
	if !allowed {
		t.Fatal("first tenant-1 attempt should be allowed")
	}

	allowed, _ = limiter.Allow(ctx, "tenant-2", "admin@example.sch.id", "127.0.0.1")
	if !allowed {
		t.Fatal("tenant-2 should have separate rate limit bucket")
	}
}

func TestNopLoginRateLimiter_AlwaysAllows(t *testing.T) {
	limiter := NewNopLoginRateLimiter()
	ctx := context.Background()
	for i := 0; i < 10; i++ {
		allowed, err := limiter.Allow(ctx, "tenant", "email", "ip")
		if err != nil {
			t.Fatalf("allow: %v", err)
		}
		if !allowed {
			t.Fatal("nop limiter should always allow")
		}
	}
}
