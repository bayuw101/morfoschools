package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/bayuw101/morfoschools/internal/modules/exams"
	"github.com/bayuw101/morfoschools/internal/modules/tenancy"
	"github.com/bayuw101/morfoschools/internal/platform/config"
	"github.com/bayuw101/morfoschools/internal/platform/db"
	httpserver "github.com/bayuw101/morfoschools/internal/platform/http"
	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var dbPool *db.Pool
	if cfg.DatabaseURL != "" {
		pool, err := db.Open(ctx, cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("open database: %v", err)
		}
		defer pool.Close()
		dbPool = pool
	}

	mux := http.NewServeMux()
	mux.Handle("/healthz", httpserver.NewRouter(dbPool))
	mux.Handle("/readyz", httpserver.NewRouter(dbPool))
	if dbPool != nil {
		pgxPool := dbPool.PgxPool()
		mux.Handle("/api/v1/tenants", tenancy.NewHandler(tenancy.NewPostgresRepository(pgxPool)))
		mux.Handle("/api/v1/exams/", exams.NewIngestionHandler(exams.NewPostgresSubmissionRepository(pgxPool)))
	}

	server := tenantctx.Middleware(withCORS(mux))
	log.Printf("api listening on %s", cfg.HTTPAddr)
	if err := http.ListenAndServe(cfg.HTTPAddr, server); err != nil {
		log.Fatalf("api server failed: %v", err)
	}
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Tenant-ID, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
