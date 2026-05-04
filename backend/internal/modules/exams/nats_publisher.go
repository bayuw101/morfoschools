package exams

import (
	"context"
	"time"

	"github.com/nats-io/nats.go"
)

const ExamSubmissionsStream = "MORFOSIS_EXAM_SUBMISSIONS"

type NATSSubmissionPublisher struct {
	conn *nats.Conn
	js   nats.JetStreamContext
}

func NewNATSSubmissionPublisher(ctx context.Context, url string) (*NATSSubmissionPublisher, error) {
	conn, err := nats.Connect(url, nats.Timeout(5*time.Second))
	if err != nil {
		return nil, err
	}
	js, err := conn.JetStream(nats.Context(ctx))
	if err != nil {
		conn.Close()
		return nil, err
	}
	if err := ensureExamSubmissionStream(js); err != nil {
		conn.Close()
		return nil, err
	}
	return &NATSSubmissionPublisher{conn: conn, js: js}, nil
}

func (publisher *NATSSubmissionPublisher) Publish(ctx context.Context, subject string, payload []byte) error {
	_, err := publisher.js.Publish(subject, payload, nats.Context(ctx))
	return err
}

func (publisher *NATSSubmissionPublisher) Close() {
	if publisher == nil || publisher.conn == nil {
		return
	}
	publisher.conn.Drain()
	publisher.conn.Close()
}

func ensureExamSubmissionStream(js nats.JetStreamContext) error {
	if _, err := js.StreamInfo(ExamSubmissionsStream); err == nil {
		return nil
	} else if err != nats.ErrStreamNotFound {
		return err
	}
	_, err := js.AddStream(&nats.StreamConfig{
		Name:      ExamSubmissionsStream,
		Subjects:  []string{"morfosis.exam.submissions.*"},
		Storage:   nats.FileStorage,
		Retention: nats.LimitsPolicy,
	})
	return err
}
