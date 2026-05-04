package analytics

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const createDatabaseSQL = `CREATE DATABASE IF NOT EXISTS morfosis`
const createTableSQL = `
CREATE TABLE IF NOT EXISTS morfosis.exam_submission_events (
    inboxId Int64,
    tenantId UUID,
    examId UUID,
    attemptId UUID,
    studentId UUID,
    receiptId String,
    submissionKind String,
    payload String,
    receivedAt DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(receivedAt)
ORDER BY (tenantId, examId, studentId, receivedAt)`

func executeQuery(ctx context.Context, u *url.URL, client *http.Client, query string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.Scheme+"://"+u.Host+"/", strings.NewReader(query))
	if err != nil {
		return err
	}
	if u.User != nil {
		password, _ := u.User.Password()
		req.SetBasicAuth(u.User.Username(), password)
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("clickhouse init schema error %d: %s", resp.StatusCode, body)
	}
	return nil
}

func InitializeClickHouseSchema(ctx context.Context, clickhouseURL string) error {
	u, err := url.Parse(clickhouseURL)
	if err != nil {
		return err
	}
	client := &http.Client{Timeout: 5 * time.Second}
	if err := executeQuery(ctx, u, client, createDatabaseSQL); err != nil {
		return err
	}
	return executeQuery(ctx, u, client, createTableSQL)
}
