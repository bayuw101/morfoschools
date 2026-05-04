package config

import "testing"

func TestLoadUsesEnvironmentWithDefaults(t *testing.T) {
	t.Setenv("APP_ENV", "test")
	t.Setenv("HTTP_ADDR", ":9090")
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("NATS_URL", "nats://example:4222")

	cfg := Load()

	if cfg.AppEnv != "test" {
		t.Fatalf("expected AppEnv test, got %q", cfg.AppEnv)
	}
	if cfg.HTTPAddr != ":9090" {
		t.Fatalf("expected HTTPAddr :9090, got %q", cfg.HTTPAddr)
	}
	if cfg.DatabaseURL != "postgres://example" {
		t.Fatalf("expected DatabaseURL from env, got %q", cfg.DatabaseURL)
	}
	if cfg.NATSURL != "nats://example:4222" {
		t.Fatalf("expected NATSURL from env, got %q", cfg.NATSURL)
	}
}

func TestLoadDefaults(t *testing.T) {
	t.Setenv("APP_ENV", "")
	t.Setenv("HTTP_ADDR", "")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("NATS_URL", "")

	cfg := Load()

	if cfg.AppEnv != "development" {
		t.Fatalf("expected default AppEnv development, got %q", cfg.AppEnv)
	}
	if cfg.HTTPAddr != ":8080" {
		t.Fatalf("expected default HTTPAddr :8080, got %q", cfg.HTTPAddr)
	}
	if cfg.DatabaseURL != "" {
		t.Fatalf("expected empty DatabaseURL default, got %q", cfg.DatabaseURL)
	}
	if cfg.NATSURL != "nats://localhost:4222" {
		t.Fatalf("expected default NATSURL, got %q", cfg.NATSURL)
	}
}
