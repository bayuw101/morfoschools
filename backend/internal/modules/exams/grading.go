package exams

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
)

type GradableQuestion struct {
	ID           string          `json:"id"`
	QuestionType string          `json:"questionType"`
	Points       int             `json:"points"`
	AnswerKey    json.RawMessage `json:"answerKey,omitempty"`
}

type ExamGradeResult struct {
	TenantID              string          `json:"tenantId"`
	ExamID                string          `json:"examId"`
	AttemptID             string          `json:"attemptId"`
	StudentID             string          `json:"studentId"`
	ReceiptID             string          `json:"receiptId"`
	Status                string          `json:"status"`
	AutoScore             int             `json:"autoScore"`
	MaxScore              int             `json:"maxScore"`
	RequiresManualGrading bool            `json:"requiresManualGrading"`
	QuestionResults       json.RawMessage `json:"questionResults"`
}

type GradingRepository interface {
	ListGradableQuestions(ctx context.Context, tenantID, examID string) ([]GradableQuestion, error)
	RecordGradeResult(ctx context.Context, result ExamGradeResult) error
	UpdateAttemptStatus(ctx context.Context, tenantID, attemptID, status string) error
}

type GradingQueueRepository interface {
	GradingRepository
	FetchUngradedFinalSubmissions(ctx context.Context, limit int) ([]SubmissionRelayEvent, error)
}

type GradingWorker struct{ repo GradingRepository }

func NewGradingWorker(repo GradingRepository) GradingWorker { return GradingWorker{repo: repo} }

func (worker GradingWorker) GradePendingOnce(ctx context.Context, repo GradingQueueRepository, limit int) (int, error) {
	if limit <= 0 {
		limit = 25
	}
	submissions, err := repo.FetchUngradedFinalSubmissions(ctx, limit)
	if err != nil {
		return 0, err
	}
	worker.repo = repo
	graded := 0
	for _, submission := range submissions {
		if _, err := worker.GradeSubmission(ctx, submission); err != nil {
			return graded, err
		}
		graded++
	}
	return graded, nil
}

func (worker GradingWorker) GradeSubmission(ctx context.Context, submission SubmissionRelayEvent) (ExamGradeResult, error) {
	if submission.SubmissionKind != SubmissionKindFinal {
		return ExamGradeResult{Status: "ignored"}, nil
	}
	questions, err := worker.repo.ListGradableQuestions(ctx, submission.TenantID, submission.ExamID)
	if err != nil {
		return ExamGradeResult{}, err
	}
	answers, err := parseSubmittedAnswers(submission.Payload)
	if err != nil {
		return ExamGradeResult{}, err
	}
	result := ExamGradeResult{TenantID: submission.TenantID, ExamID: submission.ExamID, AttemptID: submission.AttemptID, StudentID: submission.StudentID, ReceiptID: submission.ReceiptID}
	questionResults := make([]map[string]any, 0, len(questions))
	for _, question := range questions {
		if question.Points < 0 {
			return ExamGradeResult{}, errors.New("invalid_question_points")
		}
		result.MaxScore += question.Points
		entry := map[string]any{"questionId": question.ID, "questionType": question.QuestionType, "maxPoints": question.Points, "score": 0}
		switch question.QuestionType {
		case "multiple_choice":
			correct, err := selectedOptionsMatch(question.AnswerKey, answers[question.ID].SelectedOptionIDs)
			if err != nil {
				return ExamGradeResult{}, err
			}
			if correct {
				result.AutoScore += question.Points
				entry["score"] = question.Points
			}
		case "short_answer", "essay":
			result.RequiresManualGrading = true
			entry["requiresManualGrading"] = true
		default:
			result.RequiresManualGrading = true
			entry["requiresManualGrading"] = true
		}
		questionResults = append(questionResults, entry)
	}
	if result.RequiresManualGrading {
		result.Status = "waiting_for_grading"
	} else {
		result.Status = "completed"
	}
	encoded, err := json.Marshal(questionResults)
	if err != nil {
		return ExamGradeResult{}, err
	}
	result.QuestionResults = encoded
	if err := worker.repo.RecordGradeResult(ctx, result); err != nil {
		return ExamGradeResult{}, err
	}
	if err := worker.repo.UpdateAttemptStatus(ctx, submission.TenantID, submission.AttemptID, result.Status); err != nil {
		return ExamGradeResult{}, err
	}
	return result, nil
}

type submittedAnswer struct {
	QuestionID        string   `json:"questionId"`
	SelectedOptionIDs []string `json:"selectedOptionIds"`
	Text              string   `json:"text"`
}

func parseSubmittedAnswers(payload json.RawMessage) (map[string]submittedAnswer, error) {
	var parsed struct {
		Answers []submittedAnswer `json:"answers"`
	}
	if err := json.Unmarshal(payload, &parsed); err != nil {
		return nil, errors.New("invalid_submission_payload")
	}
	answers := map[string]submittedAnswer{}
	for _, answer := range parsed.Answers {
		answers[answer.QuestionID] = answer
	}
	return answers, nil
}

func selectedOptionsMatch(answerKey json.RawMessage, selected []string) (bool, error) {
	var key struct {
		CorrectOptionIDs []string `json:"correctOptionIds"`
	}
	if len(answerKey) == 0 || string(answerKey) == "null" {
		return false, nil
	}
	if err := json.Unmarshal(answerKey, &key); err != nil {
		return false, errors.New("invalid_answer_key")
	}
	correct := append([]string(nil), key.CorrectOptionIDs...)
	actual := append([]string(nil), selected...)
	sort.Strings(correct)
	sort.Strings(actual)
	if len(correct) != len(actual) {
		return false, nil
	}
	for i := range correct {
		if correct[i] != actual[i] {
			return false, nil
		}
	}
	return true, nil
}
