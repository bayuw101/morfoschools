// Package cache provides a Cache interface with Valkey (Redis-compatible),
// fake (in-memory), and nop (disabled) implementations.
// Low-spec friendly: if Valkey is unavailable, the system degrades gracefully.
package cache

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// ── Interface ──

type Cache interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key, value string, ttl time.Duration) error
	Del(ctx context.Context, key string) error
	Incr(ctx context.Context, key string, ttl time.Duration) (int64, error)
	Close() error
}

// ── Valkey (Redis-compatible) implementation ──

type valkeyCache struct {
	client *redis.Client
}

func NewValkey(url string) (Cache, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("cache: parse url: %w", err)
	}
	opts.PoolSize = 5 // low-spec friendly
	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		client.Close()
		return nil, fmt.Errorf("cache: ping valkey: %w", err)
	}
	return &valkeyCache{client: client}, nil
}

func (v *valkeyCache) Get(ctx context.Context, key string) (string, error) {
	val, err := v.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", nil
	}
	return val, err
}

func (v *valkeyCache) Set(ctx context.Context, key, value string, ttl time.Duration) error {
	return v.client.Set(ctx, key, value, ttl).Err()
}

func (v *valkeyCache) Del(ctx context.Context, key string) error {
	return v.client.Del(ctx, key).Err()
}

func (v *valkeyCache) Incr(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	pipe := v.client.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, err
	}
	return incr.Val(), nil
}

func (v *valkeyCache) Close() error {
	return v.client.Close()
}

// ── Fake (in-memory) implementation for tests ──

type fakeEntry struct {
	value string
	count int64
}

type FakeCache struct {
	mu    sync.Mutex
	store map[string]*fakeEntry
}

func NewFakeCache() *FakeCache {
	return &FakeCache{store: make(map[string]*fakeEntry)}
}

func (f *FakeCache) Get(_ context.Context, key string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	e, ok := f.store[key]
	if !ok {
		return "", nil
	}
	return e.value, nil
}

func (f *FakeCache) Set(_ context.Context, key, value string, _ time.Duration) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.store[key] = &fakeEntry{value: value}
	return nil
}

func (f *FakeCache) Del(_ context.Context, key string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.store, key)
	return nil
}

func (f *FakeCache) Incr(_ context.Context, key string, _ time.Duration) (int64, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	e, ok := f.store[key]
	if !ok {
		e = &fakeEntry{}
		f.store[key] = e
	}
	// Parse existing value or use count
	if e.value != "" {
		n, _ := strconv.ParseInt(e.value, 10, 64)
		n++
		e.value = strconv.FormatInt(n, 10)
		return n, nil
	}
	e.count++
	e.value = strconv.FormatInt(e.count, 10)
	return e.count, nil
}

func (f *FakeCache) Close() error { return nil }

// ── Nop (no-op) implementation — graceful degradation ──

type nopCache struct{}

func NewNopCache() Cache { return nopCache{} }

func (nopCache) Get(context.Context, string) (string, error)                { return "", nil }
func (nopCache) Set(context.Context, string, string, time.Duration) error   { return nil }
func (nopCache) Del(context.Context, string) error                          { return nil }
func (nopCache) Incr(context.Context, string, time.Duration) (int64, error) { return 0, nil }
func (nopCache) Close() error                                               { return nil }
