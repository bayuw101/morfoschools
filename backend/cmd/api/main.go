package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/bayuw101/morfoschools/internal/modules/academic"
	"github.com/bayuw101/morfoschools/internal/modules/auth"
	"github.com/bayuw101/morfoschools/internal/modules/courses"
	"github.com/bayuw101/morfoschools/internal/modules/exams"
	"github.com/bayuw101/morfoschools/internal/modules/identity"
	"github.com/bayuw101/morfoschools/internal/modules/tenancy"
	"github.com/bayuw101/morfoschools/internal/platform/authctx"
	"github.com/bayuw101/morfoschools/internal/platform/cache"
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

	// Valkey (Redis-compatible cache) — optional, graceful degradation
	var cacheClient cache.Cache
	if cfg.ValkeyURL != "" {
		c, err := cache.NewValkey(cfg.ValkeyURL)
		if err != nil {
			log.Printf("valkey disabled (will use nop cache): %v", err)
			cacheClient = cache.NewNopCache()
		} else {
			log.Println("valkey connected — session cache + rate limiter enabled")
			cacheClient = c
			defer cacheClient.Close()
		}
	} else {
		cacheClient = cache.NewNopCache()
	}

	mux := http.NewServeMux()
	mux.Handle("/healthz", httpserver.NewRouter(dbPool))
	mux.Handle("/readyz", httpserver.NewRouter(dbPool))
	if dbPool != nil {
		pgxPool := dbPool.PgxPool()
		authRepo := auth.NewCachedRepository(auth.NewPostgresRepository(pgxPool), cacheClient)
		loginLimiter := auth.NewLoginRateLimiter(cacheClient, 10, 10*time.Minute)
		mux.Handle("/api/v1/auth/", auth.NewHandlerWithRateLimiter(authRepo, loginLimiter))
		mux.Handle("/api/v1/tenants", tenancy.NewHandler(tenancy.NewPostgresRepository(pgxPool)))
		mux.Handle("/api/v1/users", identity.NewHandler(identity.NewPostgresRepository(pgxPool)))
		academicHandler := academic.NewHandler(academic.NewPostgresRepository(pgxPool))
		mux.Handle("/api/v1/academic/subjects", academicHandler)
		mux.Handle("/api/v1/academic/course-offerings", academicHandler)
		mux.Handle("/api/v1/academic/teaching-assignments", academicHandler)
		mux.Handle("/api/v1/academic/subject-groups", academicHandler)
		mux.Handle("/api/v1/academic/subject-groups/", academicHandler)
		courseHandler := courses.NewHandler(courses.NewPostgresRepository(pgxPool))
		mux.Handle("/api/v1/courses", courseHandler)
		mux.Handle("/api/v1/courses/", courseHandler)
		mux.Handle("/api/v1/course-modules/", courseHandler)
		mux.Handle("/api/v1/course-progress-events", courseHandler)
		examRepo := exams.NewPostgresSubmissionRepository(pgxPool)
		examRouter := exams.NewRouter(examRepo)
		mux.Handle("/api/v1/exams", examRouter)
		mux.Handle("/api/v1/exams/", examRouter)
		mux.Handle("/api/v1/receipts/", exams.NewReceiptHandler(examRepo))
		backgroundCtx := context.Background()
		startSubmissionRelay(backgroundCtx, cfg.NATSURL, examRepo)
		startGradingWorker(backgroundCtx, examRepo)
	}

	var server http.Handler
	if dbPool != nil {
		server = auth.SessionMiddleware(auth.NewCachedRepository(auth.NewPostgresRepository(dbPool.PgxPool()), cacheClient))(authctx.Middleware(tenantctx.Middleware(withCORS(mux))))
	} else {
		server = authctx.Middleware(tenantctx.Middleware(withCORS(mux)))
	}
	log.Printf("api listening on %s", cfg.HTTPAddr)
	if err := http.ListenAndServe(cfg.HTTPAddr, server); err != nil {
		log.Fatalf("api server failed: %v", err)
	}
}

func startSubmissionRelay(ctx context.Context, natsURL string, repo exams.PostgresSubmissionRepository) {
	publisher, err := exams.NewNATSSubmissionPublisher(ctx, natsURL)
	if err != nil {
		log.Printf("exam submission relay disabled: connect nats: %v", err)
		return
	}
	relay := exams.NewSubmissionRelay(repo, publisher)
	go func() {
		defer publisher.Close()
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				relayed, err := relay.RelayOnce(ctx, 50)
				if err != nil {
					log.Printf("exam submission relay failed: %v", err)
					continue
				}
				if relayed > 0 {
					log.Printf("exam submission relay published %d inbox rows", relayed)
				}
			}
		}
	}()
}

func startGradingWorker(ctx context.Context, repo exams.PostgresSubmissionRepository) {
	worker := exams.NewGradingWorker(repo)
	go func() {
		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				graded, err := worker.GradePendingOnce(ctx, repo, 25)
				if err != nil {
					log.Printf("exam grading worker failed: %v", err)
					continue
				}
				if graded > 0 {
					log.Printf("exam grading worker processed %d final submissions", graded)
				}
			}
		}
	}()
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Tenant-ID, X-User-ID, X-User-Role, X-Exam-Gate-Token, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
