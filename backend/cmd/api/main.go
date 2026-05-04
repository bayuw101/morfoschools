package main

import (
	"context"
	"io/fs"
	"log"
	"net/http"
	"time"

	morfoschools "github.com/bayuw101/morfoschools"
	"github.com/bayuw101/morfoschools/internal/modules/academic"
	"github.com/bayuw101/morfoschools/internal/modules/analytics"
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
	"github.com/bayuw101/morfoschools/internal/platform/migrate"
	"github.com/bayuw101/morfoschools/internal/platform/streaming"
	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
	"github.com/nats-io/nats.go"
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

		// Run database migrations
		migrations, _ := fs.Sub(morfoschools.MigrationsFS, "migrations")
		runner := migrate.NewRunner(pool.PgxPool(), migrations)
		log.Println("checking database migrations...")
		applied, err := runner.Run(ctx)
		if err != nil {
			log.Fatalf("database migration failed: %v", err)
		}
		if applied > 0 {
			log.Printf("applied %d database migrations", applied)
		} else {
			log.Println("database schema is up to date")
		}
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
		analyticsReader := startAnalyticsConsumer(backgroundCtx, cfg.NATSURL, cfg.ClickHouseURL)
		analyticsHandler := &analytics.Handler{Reader: analyticsReader}
		mux.HandleFunc("GET /api/v1/exams/{examId}/analytics", analyticsHandler.GetExamAnalytics)
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

func startAnalyticsConsumer(ctx context.Context, natsURL string, clickhouseURL string) analytics.ClickHouseReader {
	conn, err := nats.Connect(natsURL, nats.Timeout(5*time.Second))
	if err != nil {
		log.Printf("analytics consumer disabled: connect nats: %v", err)
		return analytics.NopReader{}
	}
	js, err := conn.JetStream(nats.Context(ctx))
	if err != nil {
		log.Printf("analytics consumer disabled: jetstream: %v", err)
		return analytics.NopReader{}
	}

	// Determine sink: ClickHouse if URL provided, otherwise Nop
	var sink analytics.SubmissionEventSink
	var reader analytics.ClickHouseReader
	if clickhouseURL != "" {
		if err := analytics.InitializeClickHouseSchema(ctx, clickhouseURL); err != nil {
			log.Printf("clickhouse schema init failed (using nop sink): %v", err)
			sink = analytics.NopSubmissionEventSink{}
			reader = analytics.NopReader{}
		} else {
			log.Println("clickhouse connected — analytics sink active")
			chSink := analytics.NewClickHouseSink(clickhouseURL, nil)
			sink = chSink
			reader = chSink
		}
	} else {
		sink = analytics.NopSubmissionEventSink{}
		reader = analytics.NopReader{}
	}
	handler := analytics.NewSubmissionEventHandler(sink)

	// Subscribe to MORFOSIS_EXAM_SUBMISSIONS stream.
	// We use "analytics-consumer" as the durable consumer name.
	sub, err := streaming.NewNatsPullSubscription(js, "morfosis.exam.submissions.*", "analytics-consumer")
	if err != nil {
		log.Printf("analytics consumer disabled: pull subscribe: %v", err)
		return analytics.NopReader{}
	}

	consumer := streaming.NewConsumer(streaming.ConsumerConfig{
		Handler:      handler,
		Subscription: sub,
		BatchSize:    25,
		IdleDelay:    1 * time.Second,
		Logger:       log.Default(),
	})

	go func() {
		defer conn.Close()
		log.Println("analytics consumer started")
		consumer.Run(ctx)
		log.Println("analytics consumer stopped")
	}()

	return reader
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
