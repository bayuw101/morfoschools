package exams

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

type fakeGradingRepository struct {
	questions       []GradableQuestion
	recorded        []ExamGradeResult
	statuses        []string
	questionsExamID string
}

func (repo *fakeGradingRepository) ListGradableQuestions(ctx context.Context, tenantID, examID string) ([]GradableQuestion, error) {
	repo.questionsExamID = examID
	return repo.questions, nil
}

func (repo *fakeGradingRepository) RecordGradeResult(ctx context.Context, result ExamGradeResult) error {
	repo.recorded = append(repo.recorded, result)
	return nil
}

func (repo *fakeGradingRepository) UpdateAttemptStatus(ctx context.Context, tenantID, attemptID, status string) error {
	repo.statuses = append(repo.statuses, status)
	return nil
}

func TestGradeSubmissionAutoGradesMultipleChoiceAttempt(t *testing.T) {
	repo := &fakeGradingRepository{questions: []GradableQuestion{
		{ID: "q1", QuestionType: "multiple_choice", Points: 2, AnswerKey: json.RawMessage(`{"correctOptionIds":["a"]}`)},
		{ID: "q2", QuestionType: "multiple_choice", Points: 3, AnswerKey: json.RawMessage(`{"correctOptionIds":["c","d"]}`)},
	}}
	worker := NewGradingWorker(repo)
	submission := SubmissionRelayEvent{
		TenantID:       "tenant-1",
		ExamID:         "exam-1",
		AttemptID:      "attempt-1",
		StudentID:      "student-1",
		ReceiptID:      "receipt-1",
		SubmissionKind: SubmissionKindFinal,
		Payload:        json.RawMessage(`{"studentId":"student-1","answers":[{"questionId":"q1","selectedOptionIds":["a"]},{"questionId":"q2","selectedOptionIds":["d","c"]}]}`),
		ReceivedAt:     time.Date(2026, 5, 4, 5, 0, 0, 0, time.UTC),
	}

	result, err := worker.GradeSubmission(context.Background(), submission)

	if err != nil {
		t.Fatalf("grade submission: %v", err)
	}
	if result.Status != "completed" || result.AutoScore != 5 || result.MaxScore != 5 || result.RequiresManualGrading {
		t.Fatalf("unexpected result: %+v", result)
	}
	if len(repo.recorded) != 1 || repo.recorded[0].ReceiptID != "receipt-1" {
		t.Fatalf("expected recorded grade result, got %+v", repo.recorded)
	}
	if len(repo.statuses) != 1 || repo.statuses[0] != "completed" {
		t.Fatalf("expected completed status, got %+v", repo.statuses)
	}
}

func TestGradeSubmissionWaitsForManualGradingWhenEssayExists(t *testing.T) {
	repo := &fakeGradingRepository{questions: []GradableQuestion{
		{ID: "q1", QuestionType: "multiple_choice", Points: 2, AnswerKey: json.RawMessage(`{"correctOptionIds":["a"]}`)},
		{ID: "q2", QuestionType: "essay", Points: 8},
	}}
	worker := NewGradingWorker(repo)
	submission := SubmissionRelayEvent{
		TenantID:       "tenant-1",
		ExamID:         "exam-1",
		AttemptID:      "attempt-1",
		StudentID:      "student-1",
		ReceiptID:      "receipt-1",
		SubmissionKind: SubmissionKindFinal,
		Payload:        json.RawMessage(`{"studentId":"student-1","answers":[{"questionId":"q1","selectedOptionIds":["b"]},{"questionId":"q2","text":"Jawaban essay"}]}`),
	}

	result, err := worker.GradeSubmission(context.Background(), submission)

	if err != nil {
		t.Fatalf("grade submission: %v", err)
	}
	if result.Status != "waiting_for_grading" || result.AutoScore != 0 || result.MaxScore != 10 || !result.RequiresManualGrading {
		t.Fatalf("unexpected result: %+v", result)
	}
	if len(repo.statuses) != 1 || repo.statuses[0] != "waiting_for_grading" {
		t.Fatalf("expected waiting_for_grading status, got %+v", repo.statuses)
	}
}

func TestGradeSubmissionIgnoresAutosave(t *testing.T) {
	repo := &fakeGradingRepository{}
	worker := NewGradingWorker(repo)

	result, err := worker.GradeSubmission(context.Background(), SubmissionRelayEvent{SubmissionKind: SubmissionKindAutosave})

	if err != nil {
		t.Fatalf("grade autosave: %v", err)
	}
	if result.Status != "ignored" || len(repo.recorded) != 0 || len(repo.statuses) != 0 {
		t.Fatalf("expected ignored autosave, result=%+v recorded=%+v statuses=%+v", result, repo.recorded, repo.statuses)
	}
}
