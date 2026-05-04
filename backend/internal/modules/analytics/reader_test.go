package analytics

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGetExamStatsReturnsData(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"totalEvents":42,"uniqueStudents":10,"lastReceived":"2026-05-04 10:00:00"}`))
	}))
	defer srv.Close()

	sink := NewClickHouseSink(srv.URL, srv.Client())
	stats, err := sink.GetExamStats(context.Background(), "tenant-1", "exam-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if stats.TotalEvents != 42 {
		t.Errorf("got TotalEvents=%d, want 42", stats.TotalEvents)
	}
	if stats.UniqueStudents != 10 {
		t.Errorf("got UniqueStudents=%d, want 10", stats.UniqueStudents)
	}
	if !strings.Contains(stats.LastReceived, "2026-05-04") {
		t.Errorf("got LastReceived=%s, want contains 2026-05-04", stats.LastReceived)
	}
}

func TestGetExamStatsEmptyResult(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		// Empty body — no rows
	}))
	defer srv.Close()

	sink := NewClickHouseSink(srv.URL, srv.Client())
	stats, err := sink.GetExamStats(context.Background(), "tenant-1", "exam-none")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if stats.TotalEvents != 0 {
		t.Errorf("got TotalEvents=%d, want 0", stats.TotalEvents)
	}
}
