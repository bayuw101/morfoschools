package migrate

import (
	"context"
	"testing"
)

func TestParseMigrationFiles(t *testing.T) {
	files := []string{
		"000001_core_foundation.sql",
		"000003_academic.sql",
		"000002_exam.sql",
		"not_a_migration.txt",
	}

	migrations := parseMigrationNames(files)
	if len(migrations) != 3 {
		t.Fatalf("expected 3 migrations, got %d", len(migrations))
	}
	// Should be sorted by version
	if migrations[0].Version != 1 || migrations[0].Name != "000001_core_foundation.sql" {
		t.Fatalf("first migration wrong: %+v", migrations[0])
	}
	if migrations[1].Version != 2 || migrations[1].Name != "000002_exam.sql" {
		t.Fatalf("second migration wrong: %+v", migrations[1])
	}
	if migrations[2].Version != 3 || migrations[2].Name != "000003_academic.sql" {
		t.Fatalf("third migration wrong: %+v", migrations[2])
	}
}

func TestFilterPendingMigrations(t *testing.T) {
	all := []Migration{
		{Version: 1, Name: "000001_a.sql"},
		{Version: 2, Name: "000002_b.sql"},
		{Version: 3, Name: "000003_c.sql"},
		{Version: 4, Name: "000004_d.sql"},
	}
	applied := map[int]bool{1: true, 2: true}

	pending := filterPending(all, applied)
	if len(pending) != 2 {
		t.Fatalf("expected 2 pending, got %d", len(pending))
	}
	if pending[0].Version != 3 {
		t.Fatalf("expected version 3 first, got %d", pending[0].Version)
	}
	if pending[1].Version != 4 {
		t.Fatalf("expected version 4 second, got %d", pending[1].Version)
	}
}

func TestRunnerInterfaceSatisfied(t *testing.T) {
	// Compile-time check that Runner satisfies the expected shape
	var _ interface {
		Run(ctx context.Context) (int, error)
	} = (*Runner)(nil)
}
