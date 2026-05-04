package exams

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

var errPublishFailed = errors.New("publish_failed")

type PendingSubmission struct {
	InboxID        int64
	TenantID       string
	ExamID         string
	AttemptID      string
	StudentID      string
	ReceiptID      string
	SubmissionKind SubmissionKind
	Payload        []byte
	ReceivedAt     time.Time
}

type SubmissionRelayEvent struct {
	InboxID        int64           `json:"inboxId"`
	TenantID       string          `json:"tenantId"`
	ExamID         string          `json:"examId"`
	AttemptID      string          `json:"attemptId"`
	StudentID      string          `json:"studentId"`
	ReceiptID      string          `json:"receiptId"`
	SubmissionKind SubmissionKind  `json:"submissionKind"`
	Payload        json.RawMessage `json:"payload"`
	ReceivedAt     time.Time       `json:"receivedAt"`
}

type SubmissionRelayRepository interface {
	FetchUnrelayedSubmissions(ctx context.Context, limit int) ([]PendingSubmission, error)
	MarkSubmissionRelayed(ctx context.Context, inboxID int64, receivedAt time.Time) error
}

type SubmissionPublisher interface {
	Publish(ctx context.Context, subject string, payload []byte) error
}

type SubmissionRelay struct {
	repo      SubmissionRelayRepository
	publisher SubmissionPublisher
}

func NewSubmissionRelay(repo SubmissionRelayRepository, publisher SubmissionPublisher) SubmissionRelay {
	return SubmissionRelay{repo: repo, publisher: publisher}
}

func (relay SubmissionRelay) RelayOnce(ctx context.Context, limit int) (int, error) {
	if limit <= 0 {
		limit = 25
	}
	pending, err := relay.repo.FetchUnrelayedSubmissions(ctx, limit)
	if err != nil {
		return 0, err
	}
	relayed := 0
	for _, submission := range pending {
		event := SubmissionRelayEvent{
			InboxID:        submission.InboxID,
			TenantID:       submission.TenantID,
			ExamID:         submission.ExamID,
			AttemptID:      submission.AttemptID,
			StudentID:      submission.StudentID,
			ReceiptID:      submission.ReceiptID,
			SubmissionKind: submission.SubmissionKind,
			Payload:        json.RawMessage(submission.Payload),
			ReceivedAt:     submission.ReceivedAt,
		}
		payload, err := json.Marshal(event)
		if err != nil {
			return relayed, err
		}
		if err := relay.publisher.Publish(ctx, subjectForSubmissionKind(submission.SubmissionKind), payload); err != nil {
			return relayed, err
		}
		if err := relay.repo.MarkSubmissionRelayed(ctx, submission.InboxID, submission.ReceivedAt); err != nil {
			return relayed, err
		}
		relayed++
	}
	return relayed, nil
}

func subjectForSubmissionKind(kind SubmissionKind) string {
	return fmt.Sprintf("morfosis.exam.submissions.%s", kind)
}
