package streaming

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"
)

// ── Tests for the JetStream consumer abstraction ──────────────

func TestConsumerCallsHandler(t *testing.T) {
	var received [][]byte
	handler := HandlerFunc(func(ctx context.Context, msg Message) error {
		received = append(received, msg.Data)
		return nil
	})

	fake := &FakeSubscription{
		messages: []Message{
			{Subject: "test.1", Data: []byte(`{"a":1}`), acked: new(bool)},
			{Subject: "test.2", Data: []byte(`{"b":2}`), acked: new(bool)},
		},
	}

	consumer := NewConsumer(ConsumerConfig{
		Handler:      handler,
		Subscription: fake,
		BatchSize:    10,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	consumer.Run(ctx)

	if len(received) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(received))
	}
	if !*fake.messages[0].acked {
		t.Error("message 0 should be acked")
	}
	if !*fake.messages[1].acked {
		t.Error("message 1 should be acked")
	}
}

func TestConsumerNacksOnHandlerError(t *testing.T) {
	fake := &FakeSubscription{
		messages: []Message{
			{Subject: "test.1", Data: []byte(`bad`), acked: new(bool), nacked: new(bool)},
		},
	}

	handler := HandlerFunc(func(ctx context.Context, msg Message) error {
		return errors.New("processing failed")
	})

	consumer := NewConsumer(ConsumerConfig{
		Handler:      handler,
		Subscription: fake,
		BatchSize:    10,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	consumer.Run(ctx)

	if *fake.messages[0].acked {
		t.Error("message should NOT be acked on error")
	}
	if !*fake.messages[0].nacked {
		t.Error("message should be nacked on error")
	}
}

func TestConsumerHandlesEmptyBatch(t *testing.T) {
	fake := &FakeSubscription{messages: nil}

	called := false
	handler := HandlerFunc(func(ctx context.Context, msg Message) error {
		called = true
		return nil
	})

	consumer := NewConsumer(ConsumerConfig{
		Handler:      handler,
		Subscription: fake,
		BatchSize:    10,
		IdleDelay:    10 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	consumer.Run(ctx)

	if called {
		t.Error("handler should not be called with empty subscription")
	}
}

func TestMessageUnmarshalJSON(t *testing.T) {
	msg := Message{Data: []byte(`{"examId":"e1","score":95}`)}
	var target struct {
		ExamID string `json:"examId"`
		Score  int    `json:"score"`
	}
	if err := json.Unmarshal(msg.Data, &target); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if target.ExamID != "e1" || target.Score != 95 {
		t.Errorf("unexpected: %+v", target)
	}
}

// ── Fake implementations for testing ──────────────────────────

type FakeSubscription struct {
	mu       sync.Mutex
	messages []Message
	fetched  bool
}

func (f *FakeSubscription) Fetch(batch int) ([]Message, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.fetched {
		return nil, nil
	}
	f.fetched = true
	return f.messages, nil
}

func (f *FakeSubscription) Close() error { return nil }
