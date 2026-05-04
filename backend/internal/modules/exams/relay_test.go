package exams

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

type fakeRelayRepository struct {
	pending        []PendingSubmission
	markedIDs      []int64
	markedAt       []time.Time
	fetchLimitSeen int
}

func (repo *fakeRelayRepository) FetchUnrelayedSubmissions(ctx context.Context, limit int) ([]PendingSubmission, error) {
	repo.fetchLimitSeen = limit
	return repo.pending, nil
}

func (repo *fakeRelayRepository) MarkSubmissionRelayed(ctx context.Context, inboxID int64, receivedAt time.Time) error {
	repo.markedIDs = append(repo.markedIDs, inboxID)
	repo.markedAt = append(repo.markedAt, receivedAt)
	return nil
}

type fakeSubmissionPublisher struct {
	subjects []string
	payloads [][]byte
}

func (publisher *fakeSubmissionPublisher) Publish(ctx context.Context, subject string, payload []byte) error {
	publisher.subjects = append(publisher.subjects, subject)
	publisher.payloads = append(publisher.payloads, payload)
	return nil
}

func TestRelayOncePublishesPendingSubmissionAndMarksRelayed(t *testing.T) {
	receivedAt := time.Date(2026, 5, 4, 4, 0, 0, 0, time.UTC)
	repo := &fakeRelayRepository{pending: []PendingSubmission{{
		InboxID:        42,
		TenantID:       "tenant-1",
		ExamID:         "exam-1",
		AttemptID:      "attempt-1",
		StudentID:      "student-1",
		ReceiptID:      "receipt-1",
		SubmissionKind: SubmissionKindFinal,
		Payload:        []byte(`{"studentId":"student-1","answers":[]}`),
		ReceivedAt:     receivedAt,
	}}}
	publisher := &fakeSubmissionPublisher{}
	relay := NewSubmissionRelay(repo, publisher)

	relayed, err := relay.RelayOnce(context.Background(), 10)

	if err != nil {
		t.Fatalf("relay once: %v", err)
	}
	if relayed != 1 {
		t.Fatalf("expected 1 relayed row, got %d", relayed)
	}
	if repo.fetchLimitSeen != 10 {
		t.Fatalf("expected fetch limit 10, got %d", repo.fetchLimitSeen)
	}
	if len(publisher.subjects) != 1 || publisher.subjects[0] != "morfosis.exam.submissions.final_submit" {
		t.Fatalf("unexpected publish subjects: %+v", publisher.subjects)
	}
	if len(repo.markedIDs) != 1 || repo.markedIDs[0] != 42 || !repo.markedAt[0].Equal(receivedAt) {
		t.Fatalf("unexpected relayed markers: ids=%+v times=%+v", repo.markedIDs, repo.markedAt)
	}
	var event SubmissionRelayEvent
	if err := json.Unmarshal(publisher.payloads[0], &event); err != nil {
		t.Fatalf("decode relay event: %v", err)
	}
	if event.ReceiptID != "receipt-1" || event.SubmissionKind != SubmissionKindFinal || string(event.Payload) == "" {
		t.Fatalf("unexpected relay event: %+v", event)
	}
}

func TestRelayOnceDoesNotMarkWhenPublishFails(t *testing.T) {
	repo := &fakeRelayRepository{pending: []PendingSubmission{{
		InboxID:        42,
		SubmissionKind: SubmissionKindAutosave,
		Payload:        []byte(`{"studentId":"student-1"}`),
		ReceivedAt:     time.Date(2026, 5, 4, 4, 0, 0, 0, time.UTC),
	}}}
	publisher := failingSubmissionPublisher{}
	relay := NewSubmissionRelay(repo, publisher)

	_, err := relay.RelayOnce(context.Background(), 10)

	if err == nil {
		t.Fatalf("expected publish error")
	}
	if len(repo.markedIDs) != 0 {
		t.Fatalf("expected no rows marked relayed, got %+v", repo.markedIDs)
	}
}

type failingSubmissionPublisher struct{}

func (failingSubmissionPublisher) Publish(ctx context.Context, subject string, payload []byte) error {
	return errPublishFailed
}
