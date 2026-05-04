package analytics

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type ExamStats struct {
	TotalEvents    int64  `json:"totalEvents"`
	UniqueStudents int64  `json:"uniqueStudents"`
	LastReceived   string `json:"lastReceived"`
}

type ClickHouseReader interface {
	GetExamStats(ctx context.Context, tenantID, examID string) (ExamStats, error)
}

func (sink *ClickHouseSink) GetExamStats(ctx context.Context, tenantID, examID string) (ExamStats, error) {
	query := fmt.Sprintf(`
		SELECT 
			count() as totalEvents, 
			uniq(studentId) as uniqueStudents,
			max(receivedAt) as lastReceived
		FROM morfosis.exam_submission_events 
		WHERE tenantId = '%s' AND examId = '%s'
		FORMAT JSONEachRow`, tenantID, examID)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sink.endpoint+"/", strings.NewReader(query))
	if err != nil {
		return ExamStats{}, err
	}
	if sink.username != "" {
		req.SetBasicAuth(sink.username, sink.password)
	}

	resp, err := sink.client.Do(req)
	if err != nil {
		return ExamStats{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return ExamStats{}, fmt.Errorf("clickhouse read error %d: %s", resp.StatusCode, body)
	}

	var stats ExamStats
	if err := json.NewDecoder(resp.Body).Decode(&stats); err != nil {
		if err == io.EOF {
			return ExamStats{}, nil // No rows
		}
		return ExamStats{}, fmt.Errorf("clickhouse decode: %w", err)
	}
	return stats, nil
}
