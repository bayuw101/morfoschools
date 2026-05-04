package config

import "os"

type Config struct {
	AppEnv        string
	HTTPAddr      string
	DatabaseURL   string
	NATSURL       string
	ValkeyURL     string
	ClickHouseURL string
}

func Load() Config {
	return Config{
		AppEnv:        envOrDefault("APP_ENV", "development"),
		HTTPAddr:      envOrDefault("HTTP_ADDR", ":8080"),
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		NATSURL:       envOrDefault("NATS_URL", "nats://localhost:4222"),
		ValkeyURL:     os.Getenv("VALKEY_URL"),
		ClickHouseURL: os.Getenv("CLICKHOUSE_URL"),
	}
}

func envOrDefault(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
