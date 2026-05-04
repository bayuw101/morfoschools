package cache

import (
	"context"
	"testing"
	"time"
)

// ── Test the Cache interface contract ──
// Uses FakeCache for unit tests; real Valkey tested via integration.

func TestFakeCache_SetGet(t *testing.T) {
	c := NewFakeCache()
	ctx := context.Background()

	// Miss returns empty
	val, err := c.Get(ctx, "missing")
	if err != nil {
		t.Fatalf("get missing: %v", err)
	}
	if val != "" {
		t.Fatalf("expected empty, got %q", val)
	}

	// Set then Get
	if err := c.Set(ctx, "key1", "value1", 5*time.Minute); err != nil {
		t.Fatalf("set: %v", err)
	}
	val, err = c.Get(ctx, "key1")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if val != "value1" {
		t.Fatalf("expected value1, got %q", val)
	}
}

func TestFakeCache_Del(t *testing.T) {
	c := NewFakeCache()
	ctx := context.Background()

	_ = c.Set(ctx, "key1", "v", time.Minute)
	if err := c.Del(ctx, "key1"); err != nil {
		t.Fatalf("del: %v", err)
	}
	val, _ := c.Get(ctx, "key1")
	if val != "" {
		t.Fatalf("expected empty after del, got %q", val)
	}
}

func TestFakeCache_Incr(t *testing.T) {
	c := NewFakeCache()
	ctx := context.Background()

	n, err := c.Incr(ctx, "counter", time.Minute)
	if err != nil {
		t.Fatalf("incr: %v", err)
	}
	if n != 1 {
		t.Fatalf("expected 1, got %d", n)
	}

	n, err = c.Incr(ctx, "counter", time.Minute)
	if err != nil {
		t.Fatalf("incr: %v", err)
	}
	if n != 2 {
		t.Fatalf("expected 2, got %d", n)
	}
}

func TestNopCache_Passthrough(t *testing.T) {
	c := NewNopCache()
	ctx := context.Background()

	// Nop never stores anything
	_ = c.Set(ctx, "k", "v", time.Minute)
	val, err := c.Get(ctx, "k")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if val != "" {
		t.Fatalf("nop should always return empty, got %q", val)
	}

	n, err := c.Incr(ctx, "c", time.Minute)
	if err != nil {
		t.Fatalf("incr: %v", err)
	}
	if n != 0 {
		t.Fatalf("nop incr should return 0, got %d", n)
	}
}
