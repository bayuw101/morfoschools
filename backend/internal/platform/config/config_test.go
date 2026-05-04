package config

import "testing"

func TestLoadUsesEnvironmentWithDefaults(t *testing.T) {
	t.Setenv("APP_ENV", "test")
	t.Setenv("HTTP_ADDR", ":9090")
	t.Setenv("DATABASE_URL", "postgres://example")

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
}

func TestLoadDefaults(t *testing.T) {
	t.Setenv("APP_ENV", "")
	t.Setenv("HTTP_ADDR", "")
	t.Setenv("DATABASE_URL", "")

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
}
