package analytics

import (
	"context"
	"encoding/json"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/streaming"
)

type SubmissionEvent struct {
	InboxID    int64           `json:"inboxId"`
	TenantID   string          `json:"tenantId"`
	ExamID     string          `json:"examId"`
	AttemptID  string          `json:"attemptId"`
	StudentID  string          `json:"studentId"`
	ReceiptID  string          `json:"receiptId"`
	Kind       string          `json:"submissionKind"`
	Payload    json.RawMessage `json:"payload"`
	ReceivedAt time.Time       `json:"receivedAt"`
	Subject    string          `json:"-"`
}

type SubmissionEventSink interface {
	WriteSubmissionEvent(context.Context, SubmissionEvent) error
}

type SubmissionEventHandler struct {
	sink SubmissionEventSink
}

func NewSubmissionEventHandler(sink SubmissionEventSink) SubmissionEventHandler {
	return SubmissionEventHandler{sink: sink}
}

func (handler SubmissionEventHandler) HandleMessage(ctx context.Context, msg streaming.Message) error {
	var event SubmissionEvent
	if err := json.Unmarshal(msg.Data, &event); err != nil {
		return err
	}
	event.Subject = msg.Subject
	return handler.sink.WriteSubmissionEvent(ctx, event)
}

type NopSubmissionEventSink struct{}

func (NopSubmissionEventSink) WriteSubmissionEvent(context.Context, SubmissionEvent) error {
	return nil
}
