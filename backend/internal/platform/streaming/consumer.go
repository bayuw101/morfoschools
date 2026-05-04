package streaming

import (
	"context"
	"log"
	"time"
)

type Message struct {
	Subject string
	Data    []byte
	acked   *bool
	nacked  *bool
	ackFn   func() error
	nackFn  func() error
}

func (m Message) Ack() error {
	if m.acked != nil {
		*m.acked = true
	}
	if m.ackFn != nil {
		return m.ackFn()
	}
	return nil
}

func (m Message) Nak() error {
	if m.nacked != nil {
		*m.nacked = true
	}
	if m.nackFn != nil {
		return m.nackFn()
	}
	return nil
}

type Subscription interface {
	Fetch(batch int) ([]Message, error)
	Close() error
}

type Handler interface {
	HandleMessage(context.Context, Message) error
}

type HandlerFunc func(context.Context, Message) error

func (fn HandlerFunc) HandleMessage(ctx context.Context, msg Message) error {
	return fn(ctx, msg)
}

type ConsumerConfig struct {
	Handler      Handler
	Subscription Subscription
	BatchSize    int
	IdleDelay    time.Duration
	Logger       *log.Logger
}

type Consumer struct {
	config ConsumerConfig
}

func NewConsumer(config ConsumerConfig) Consumer {
	if config.BatchSize <= 0 {
		config.BatchSize = 25
	}
	if config.IdleDelay <= 0 {
		config.IdleDelay = 100 * time.Millisecond
	}
	return Consumer{config: config}
}

func (consumer Consumer) Run(ctx context.Context) {
	if consumer.config.Subscription == nil || consumer.config.Handler == nil {
		return
	}
	defer consumer.config.Subscription.Close()

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		messages, err := consumer.config.Subscription.Fetch(consumer.config.BatchSize)
		if err != nil {
			consumer.logf("stream fetch failed: %v", err)
			consumer.sleepOrDone(ctx)
			continue
		}
		if len(messages) == 0 {
			consumer.sleepOrDone(ctx)
			continue
		}
		for _, msg := range messages {
			if err := consumer.config.Handler.HandleMessage(ctx, msg); err != nil {
				consumer.logf("stream handler failed subject=%s: %v", msg.Subject, err)
				_ = msg.Nak()
				continue
			}
			_ = msg.Ack()
		}
	}
}

func (consumer Consumer) sleepOrDone(ctx context.Context) {
	timer := time.NewTimer(consumer.config.IdleDelay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
	case <-timer.C:
	}
}

func (consumer Consumer) logf(format string, args ...any) {
	if consumer.config.Logger != nil {
		consumer.config.Logger.Printf(format, args...)
	}
}
