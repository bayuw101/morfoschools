package analytics

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type clickHouseRow struct {
	InboxID   int64  `json:"inboxId"`
	TenantID  string `json:"tenantId"`
	ExamID    string `json:"examId"`
	AttemptID string `json:"attemptId"`
	StudentID string `json:"studentId"`
	ReceiptID string `json:"receiptId"`
	Kind      string `json:"submissionKind"`
	Payload   string `json:"payload"`
	Received  string `json:"receivedAt"`
}

type ClickHouseSink struct {
	endpoint string
	username string
	password string
	client   *http.Client
}

func NewClickHouseSink(clickhouseURL string, client *http.Client) *ClickHouseSink {
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	endpoint := clickhouseURL
	var username, password string
	if u, err := url.Parse(clickhouseURL); err == nil {
		endpoint = u.Scheme + "://" + u.Host
		if u.User != nil {
			username = u.User.Username()
			password, _ = u.User.Password()
		}
	}
	return &ClickHouseSink{endpoint: endpoint, username: username, password: password, client: client}
}

func (sink *ClickHouseSink) WriteSubmissionEvent(ctx context.Context, event SubmissionEvent) error {
	row := clickHouseRow{
		InboxID:   event.InboxID,
		TenantID:  event.TenantID,
		ExamID:    event.ExamID,
		AttemptID: event.AttemptID,
		StudentID: event.StudentID,
		ReceiptID: event.ReceiptID,
		Kind:      event.Kind,
		Payload:   string(event.Payload),
		Received:  event.ReceivedAt.UTC().Format("2006-01-02 15:04:05"),
	}
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(row); err != nil {
		return fmt.Errorf("clickhouse encode: %w", err)
	}

	url := sink.endpoint + "/?query=INSERT+INTO+morfosis.exam_submission_events+FORMAT+JSONEachRow"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &buf)
	if err != nil {
		return fmt.Errorf("clickhouse request: %w", err)
	}
	if sink.username != "" {
		req.SetBasicAuth(sink.username, sink.password)
	}
	resp, err := sink.client.Do(req)
	if err != nil {
		return fmt.Errorf("clickhouse post: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("clickhouse error %d: %s", resp.StatusCode, body)
	}
	return nil
}
