package analytics

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestClickHouseSinkWritesEvent(t *testing.T) {
	var body []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("query") == "INSERT INTO morfosis.exam_submission_events FORMAT JSONEachRow" {
			body, _ = io.ReadAll(r.Body)
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	sink := NewClickHouseSink(srv.URL, srv.Client())

	event := SubmissionEvent{
		InboxID:    1,
		TenantID:   "t1",
		ExamID:     "e1",
		AttemptID:  "a1",
		StudentID:  "s1",
		ReceiptID:  "r1",
		Kind:       "autosave",
		Payload:    json.RawMessage(`{"a":1}`),
		ReceivedAt: time.Date(2026, 5, 4, 10, 0, 0, 0, time.UTC),
	}

	if err := sink.WriteSubmissionEvent(context.Background(), event); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	expected := `{"inboxId":1,"tenantId":"t1","examId":"e1","attemptId":"a1","studentId":"s1","receiptId":"r1","submissionKind":"autosave","payload":"{\"a\":1}","receivedAt":"2026-05-04 10:00:00"}`
	if string(body) != expected+"\n" {
		t.Errorf("got body: %q, want: %q", string(body), expected+"\n")
	}
}
