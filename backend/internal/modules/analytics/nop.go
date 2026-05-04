package analytics

import "context"

type NopReader struct{}

func (n NopReader) GetExamStats(ctx context.Context, tenantID, examID string) (ExamStats, error) {
	return ExamStats{}, nil
}
