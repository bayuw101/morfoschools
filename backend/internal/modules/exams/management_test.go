package exams

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type fakeManagementRepository struct {
	exams              []Exam
	questions          []ExamQuestion
	targets            []ExamTarget
	gateWindows        []ExamGateWindow
	prerequisites      []ExamPrerequisite
	capturedTenant     string
	capturedExam       CreateExamParams
	capturedQuestion   CreateExamQuestionParams
	capturedTarget     CreateExamTargetParams
	capturedGateWindow CreateExamGateWindowParams
	capturedPrereq     CreateExamPrerequisiteParams
	capturedExamID     string
	err                error
}

func (repo *fakeManagementRepository) ListExams(ctx context.Context, tenantID string) ([]Exam, error) {
	repo.capturedTenant = tenantID
	return repo.exams, repo.err
}
func (repo *fakeManagementRepository) CreateExam(ctx context.Context, tenantID string, params CreateExamParams) (Exam, error) {
	repo.capturedTenant = tenantID
	repo.capturedExam = params
	if repo.err != nil {
		return Exam{}, repo.err
	}
	return Exam{ID: "exam-1", Title: params.Title, SubjectName: params.SubjectName, Status: params.Status, DurationMinutes: params.DurationMinutes, SecurityMode: params.SecurityMode}, nil
}
func (repo *fakeManagementRepository) ListQuestions(ctx context.Context, tenantID, examID string) ([]ExamQuestion, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	return repo.questions, repo.err
}
func (repo *fakeManagementRepository) CreateQuestion(ctx context.Context, tenantID, examID string, params CreateExamQuestionParams) (ExamQuestion, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	repo.capturedQuestion = params
	if repo.err != nil {
		return ExamQuestion{}, repo.err
	}
	return ExamQuestion{ID: "question-1", ExamID: examID, QuestionType: params.QuestionType, Prompt: params.Prompt, Position: params.Position, Points: params.Points, Options: params.Options}, nil
}
func (repo *fakeManagementRepository) ListTargets(ctx context.Context, tenantID, examID string) ([]ExamTarget, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	return repo.targets, repo.err
}
func (repo *fakeManagementRepository) CreateTarget(ctx context.Context, tenantID, examID string, params CreateExamTargetParams) (ExamTarget, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	repo.capturedTarget = params
	if repo.err != nil {
		return ExamTarget{}, repo.err
	}
	return ExamTarget{ID: "target-1", ExamID: examID, TargetType: params.TargetType, TargetID: params.TargetID}, nil
}
func (repo *fakeManagementRepository) ListGateWindows(ctx context.Context, tenantID, examID string) ([]ExamGateWindow, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	return repo.gateWindows, repo.err
}
func (repo *fakeManagementRepository) CreateGateWindow(ctx context.Context, tenantID, examID string, params CreateExamGateWindowParams) (ExamGateWindow, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	repo.capturedGateWindow = params
	if repo.err != nil {
		return ExamGateWindow{}, repo.err
	}
	return ExamGateWindow{ID: "gate-1", ExamID: examID, TargetType: params.TargetType, OpensAt: params.OpensAt, ClosesAt: params.ClosesAt}, nil
}
func (repo *fakeManagementRepository) ListPrerequisites(ctx context.Context, tenantID, examID string) ([]ExamPrerequisite, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	return repo.prerequisites, repo.err
}
func (repo *fakeManagementRepository) CreatePrerequisite(ctx context.Context, tenantID, examID string, params CreateExamPrerequisiteParams) (ExamPrerequisite, error) {
	repo.capturedTenant = tenantID
	repo.capturedExamID = examID
	repo.capturedPrereq = params
	if repo.err != nil {
		return ExamPrerequisite{}, repo.err
	}
	return ExamPrerequisite{ID: "prereq-1", ExamID: examID, PrerequisiteType: params.PrerequisiteType, RequiredID: params.RequiredID}, nil
}

func TestManagementRoutesRequireTenantContext(t *testing.T) {
	handler := NewManagementHandler(&fakeManagementRepository{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/exams", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestCreateExamNormalizesAndValidatesProfile(t *testing.T) {
	repo := &fakeManagementRepository{}
	handler := tenantctx.Middleware(NewManagementHandler(repo))
	body := `{"title":" UTS Matematika ","subjectName":" Matematika ","durationMinutes":90,"securityMode":" Secure_Required ","createdBy":"user-1"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedExam.Title != "UTS Matematika" || repo.capturedExam.SubjectName != "Matematika" || repo.capturedExam.Status != "draft" || repo.capturedExam.SecurityMode != "secure_required" {
		t.Fatalf("unexpected exam params: %+v", repo.capturedExam)
	}
}

func TestCreateExamRejectsInvalidDuration(t *testing.T) {
	handler := tenantctx.Middleware(NewManagementHandler(&fakeManagementRepository{}))
	body := `{"title":"UTS","subjectName":"Matematika","durationMinutes":0}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestCreateQuestionSupportsMultipleChoiceOptions(t *testing.T) {
	repo := &fakeManagementRepository{}
	handler := tenantctx.Middleware(NewManagementHandler(repo))
	body := `{"questionType":" Multiple_Choice ","prompt":" 2 + 2? ","position":1,"points":10,"options":[{"id":"a","text":"4","isCorrect":true}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/questions", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedExamID != "exam-1" || repo.capturedQuestion.QuestionType != "multiple_choice" || len(repo.capturedQuestion.Options) != 1 {
		t.Fatalf("unexpected question capture: %+v", repo.capturedQuestion)
	}
}

func TestCreateQuestionRejectsMultipleChoiceWithoutCorrectOption(t *testing.T) {
	handler := tenantctx.Middleware(NewManagementHandler(&fakeManagementRepository{}))
	body := `{"questionType":"multiple_choice","prompt":"2 + 2?","position":1,"points":10,"options":[{"id":"a","text":"3"}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/questions", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestCreateTargetCapturesTargetTypeAndID(t *testing.T) {
	repo := &fakeManagementRepository{}
	handler := tenantctx.Middleware(NewManagementHandler(repo))
	body := `{"targetType":" Subject_Group ","targetId":"group-1"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/targets", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedTarget.TargetType != "subject_group" || repo.capturedTarget.TargetID != "group-1" {
		t.Fatalf("unexpected target: %+v", repo.capturedTarget)
	}
}

func TestCreateGateWindowValidatesCloseAfterOpen(t *testing.T) {
	handler := tenantctx.Middleware(NewManagementHandler(&fakeManagementRepository{}))
	body := `{"targetType":"global","opensAt":"2026-05-04T09:00:00Z","closesAt":"2026-05-04T08:00:00Z"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/gate-windows", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestCreatePrerequisiteCapturesCourseRequirement(t *testing.T) {
	repo := &fakeManagementRepository{}
	handler := tenantctx.Middleware(NewManagementHandler(repo))
	body := `{"prerequisiteType":" course_completed ","requiredId":"course-1"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exams/exam-1/prerequisites", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedPrereq.PrerequisiteType != "course_completed" || repo.capturedPrereq.RequiredID != "course-1" {
		t.Fatalf("unexpected prerequisite: %+v", repo.capturedPrereq)
	}
	var payload ExamPrerequisite
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload.ID != "prereq-1" {
		t.Fatalf("unexpected payload: %+v", payload)
	}
}
