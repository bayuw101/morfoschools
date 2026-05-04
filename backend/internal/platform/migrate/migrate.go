package migrate

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Migration struct {
	Version int
	Name    string
}

type Runner struct {
	db *pgxpool.Pool
	fs fs.FS
}

// NewRunner creates a migration runner against the embedded filesystem.
func NewRunner(db *pgxpool.Pool, files fs.FS) *Runner {
	return &Runner{db: db, fs: files}
}

// Run executes all pending migrations. Returns number of applied migrations.
func (r *Runner) Run(ctx context.Context) (int, error) {
	// Create tracking table
	_, err := r.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return 0, fmt.Errorf("create schema_migrations: %w", err)
	}

	// Read applied versions
	rows, err := r.db.Query(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return 0, fmt.Errorf("read applied migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[int]bool)
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			return 0, fmt.Errorf("scan applied version: %w", err)
		}
		applied[v] = true
	}
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("iterate applied versions: %w", err)
	}

	// Read available files
	entries, err := fs.ReadDir(r.fs, ".")
	if err != nil {
		return 0, fmt.Errorf("read migration dir: %w", err)
	}
	var names []string
	for _, entry := range entries {
		if !entry.IsDir() {
			names = append(names, entry.Name())
		}
	}

	available := parseMigrationNames(names)
	pending := filterPending(available, applied)

	if len(pending) == 0 {
		return 0, nil
	}

	appliedCount := 0
	for _, m := range pending {
		if err := r.apply(ctx, m); err != nil {
			return appliedCount, fmt.Errorf("apply %s: %w", m.Name, err)
		}
		appliedCount++
		log.Printf("applied migration: %s", m.Name)
	}

	return appliedCount, nil
}

func (r *Runner) apply(ctx context.Context, m Migration) error {
	content, err := fs.ReadFile(r.fs, m.Name)
	if err != nil {
		return fmt.Errorf("read %s: %w", m.Name, err)
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, string(content)); err != nil {
		return fmt.Errorf("exec sql: %w", err)
	}

	if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)", m.Version, m.Name); err != nil {
		return fmt.Errorf("record migration: %w", err)
	}

	return tx.Commit(ctx)
}

func parseMigrationNames(names []string) []Migration {
	var migrations []Migration
	for _, name := range names {
		if filepath.Ext(name) != ".sql" {
			continue
		}
		parts := strings.SplitN(name, "_", 2)
		if len(parts) != 2 {
			continue
		}
		version, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}
		migrations = append(migrations, Migration{
			Version: version,
			Name:    name,
		})
	}
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})
	return migrations
}

func filterPending(all []Migration, applied map[int]bool) []Migration {
	var pending []Migration
	for _, m := range all {
		if !applied[m.Version] {
			pending = append(pending, m)
		}
	}
	return pending
}
