package streaming

import (
	"time"

	"github.com/nats-io/nats.go"
)

type NatsPullSubscription struct {
	sub *nats.Subscription
}

func NewNatsPullSubscription(js nats.JetStreamContext, subject string, durable string) (*NatsPullSubscription, error) {
	sub, err := js.PullSubscribe(subject, durable)
	if err != nil {
		return nil, err
	}
	return &NatsPullSubscription{sub: sub}, nil
}

func (s *NatsPullSubscription) Fetch(batch int) ([]Message, error) {
	if s.sub == nil {
		return nil, nil
	}
	msgs, err := s.sub.Fetch(batch, nats.MaxWait(time.Second))
	if err != nil {
		if err == nats.ErrTimeout {
			return nil, nil
		}
		return nil, err
	}
	var result []Message
	for _, m := range msgs {
		msg := m // copy
		result = append(result, Message{
			Subject: msg.Subject,
			Data:    msg.Data,
			ackFn:   func() error { return msg.Ack() },
			nackFn:  func() error { return msg.Nak() },
		})
	}
	return result, nil
}

func (s *NatsPullSubscription) Close() error {
	if s.sub == nil {
		return nil
	}
	return s.sub.Unsubscribe()
}
