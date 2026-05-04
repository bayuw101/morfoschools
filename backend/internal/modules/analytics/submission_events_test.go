package analytics

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/streaming"
)

func TestSubmissionEventHandlerWritesEventToSink(t *testing.T) {
	sink := &fakeSubmissionSink{}
	handler := NewSubmissionEventHandler(sink)

	payload := map[string]any{
		"inboxId":        123,
		"tenantId":       "tenant-1",
		"examId":         "exam-1",
		"attemptId":      "attempt-1",
		"studentId":      "student-1",
		"receiptId":      "receipt-1",
		"submissionKind": "final_submit",
		"payload": map[string]any{
			"answers": []any{},
		},
		"receivedAt": time.Now().UTC().Format(time.RFC3339Nano),
	}
	raw, _ := json.Marshal(payload)

	if err := handler.HandleMessage(context.Background(), streaming.Message{Subject: "morfosis.exam.submissions.final_submit", Data: raw}); err != nil {
		t.Fatalf("handle message: %v", err)
	}

	if len(sink.events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(sink.events))
	}
	got := sink.events[0]
	if got.TenantID != "tenant-1" || got.ExamID != "exam-1" || got.Kind != "final_submit" {
		t.Fatalf("unexpected event: %+v", got)
	}
}

func TestSubmissionEventHandlerRejectsInvalidJSON(t *testing.T) {
	handler := NewSubmissionEventHandler(&fakeSubmissionSink{})
	err := handler.HandleMessage(context.Background(), streaming.Message{Subject: "bad", Data: []byte(`not-json`)})
	if err == nil {
		t.Fatal("expected error")
	}
}

type fakeSubmissionSink struct {
	events []SubmissionEvent
}

func (s *fakeSubmissionSink) WriteSubmissionEvent(ctx context.Context, event SubmissionEvent) error {
	s.events = append(s.events, event)
	return nil
}
