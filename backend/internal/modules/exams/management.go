package exams

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type Exam struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	SubjectName     string `json:"subjectName"`
	Status          string `json:"status"`
	DurationMinutes int    `json:"durationMinutes"`
	SecurityMode    string `json:"securityMode"`
	CreatedBy       string `json:"createdBy,omitempty"`
	QuestionCount   int    `json:"questionCount"`
}

type CreateExamParams struct {
	Title           string `json:"title"`
	SubjectName     string `json:"subjectName"`
	Status          string `json:"status"`
	DurationMinutes int    `json:"durationMinutes"`
	SecurityMode    string `json:"securityMode"`
	CreatedBy       string `json:"createdBy"`
}

type QuestionOption struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	IsCorrect bool   `json:"isCorrect"`
}

type ExamQuestion struct {
	ID           string           `json:"id"`
	ExamID       string           `json:"examId"`
	QuestionType string           `json:"questionType"`
	Prompt       string           `json:"prompt"`
	Position     int              `json:"position"`
	Points       int              `json:"points"`
	Options      []QuestionOption `json:"options,omitempty"`
	Rubric       string           `json:"rubric,omitempty"`
}

type CreateExamQuestionParams struct {
	QuestionType string           `json:"questionType"`
	Prompt       string           `json:"prompt"`
	Position     int              `json:"position"`
	Points       int              `json:"points"`
	Options      []QuestionOption `json:"options"`
	Rubric       string           `json:"rubric"`
}

type ExamTarget struct {
	ID         string `json:"id"`
	ExamID     string `json:"examId"`
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
}

type CreateExamTargetParams struct {
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
}

type ExamGateWindow struct {
	ID          string `json:"id"`
	ExamID      string `json:"examId"`
	TargetType  string `json:"targetType"`
	TargetID    string `json:"targetId,omitempty"`
	PublishesAt string `json:"publishesAt,omitempty"`
	OpensAt     string `json:"opensAt"`
	ClosesAt    string `json:"closesAt"`
	Password    string `json:"password,omitempty"`
}

type CreateExamGateWindowParams struct {
	TargetType  string `json:"targetType"`
	TargetID    string `json:"targetId"`
	PublishesAt string `json:"publishesAt"`
	OpensAt     string `json:"opensAt"`
	ClosesAt    string `json:"closesAt"`
	Password    string `json:"password"`
}

type ExamPrerequisite struct {
	ID               string `json:"id"`
	ExamID           string `json:"examId"`
	PrerequisiteType string `json:"prerequisiteType"`
	RequiredID       string `json:"requiredId"`
}

type CreateExamPrerequisiteParams struct {
	PrerequisiteType string `json:"prerequisiteType"`
	RequiredID       string `json:"requiredId"`
}

type ManagementRepository interface {
	ListExams(ctx context.Context, tenantID string) ([]Exam, error)
	GetExam(ctx context.Context, tenantID string, examID string) (Exam, error)
	CreateExam(ctx context.Context, tenantID string, params CreateExamParams) (Exam, error)
	UpdateExam(ctx context.Context, tenantID string, examID string, params CreateExamParams) (Exam, error)
	DeleteExam(ctx context.Context, tenantID string, examID string) error
	ListQuestions(ctx context.Context, tenantID, examID string) ([]ExamQuestion, error)
	CreateQuestion(ctx context.Context, tenantID, examID string, params CreateExamQuestionParams) (ExamQuestion, error)
	ListTargets(ctx context.Context, tenantID, examID string) ([]ExamTarget, error)
	CreateTarget(ctx context.Context, tenantID, examID string, params CreateExamTargetParams) (ExamTarget, error)
	ListGateWindows(ctx context.Context, tenantID, examID string) ([]ExamGateWindow, error)
	CreateGateWindow(ctx context.Context, tenantID, examID string, params CreateExamGateWindowParams) (ExamGateWindow, error)
	ListPrerequisites(ctx context.Context, tenantID, examID string) ([]ExamPrerequisite, error)
	CreatePrerequisite(ctx context.Context, tenantID, examID string, params CreateExamPrerequisiteParams) (ExamPrerequisite, error)
}

type ManagementHandler struct{ repo ManagementRepository }

func NewManagementHandler(repo ManagementRepository) http.Handler {
	return ManagementHandler{repo: repo}
}

func (h ManagementHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/")
	if path == "/api/v1/exams" {
		h.handleExams(w, r, tenantID, "")
		return
	}
	examID, child, ok := parseManagementPath(path)
	if !ok {
		// Could be /api/v1/exams/{id}
		parts := strings.Split(strings.Trim(path, "/"), "/")
		if len(parts) == 4 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "exams" {
			h.handleExams(w, r, tenantID, parts[3])
			return
		}
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	switch child {
	case "questions":
		h.handleQuestions(w, r, tenantID, examID)
	case "targets":
		h.handleTargets(w, r, tenantID, examID)
	case "gate-windows":
		h.handleGateWindows(w, r, tenantID, examID)
	case "prerequisites":
		h.handlePrerequisites(w, r, tenantID, examID)
	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	}
}

func parseManagementPath(path string) (string, string, bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 5 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "exams" || parts[3] == "" {
		return "", "", false
	}
	return parts[3], parts[4], true
}

func (h ManagementHandler) handleExams(w http.ResponseWriter, r *http.Request, tenantID, examID string) {
	switch r.Method {
	case http.MethodGet:
		if examID != "" {
			item, err := h.repo.GetExam(r.Context(), tenantID, examID)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": "get_exam_failed"})
				return
			}
			writeJSON(w, 200, item)
			return
		}
		items, err := h.repo.ListExams(r.Context(), tenantID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "list_exams_failed"})
			return
		}
		writeJSON(w, 200, map[string][]Exam{"data": items})
	case http.MethodPost:
		var p CreateExamParams
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeExam(p)
		if err := validateExam(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.CreateExam(r.Context(), tenantID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "create_exam_failed"})
			return
		}
		writeJSON(w, 201, item)
	case http.MethodPatch:
		if examID == "" {
			writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
			return
		}
		var p CreateExamParams
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeExam(p)
		if err := validateExam(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.UpdateExam(r.Context(), tenantID, examID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "update_exam_failed"})
			return
		}
		writeJSON(w, 200, item)
	case http.MethodDelete:
		if examID == "" {
			writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
			return
		}
		if err := h.repo.DeleteExam(r.Context(), tenantID, examID); err != nil {
			writeJSON(w, 500, map[string]string{"error": "delete_exam_failed"})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
	}
}
func (h ManagementHandler) handleQuestions(w http.ResponseWriter, r *http.Request, tenantID, examID string) {
	switch r.Method {
	case http.MethodGet:
		items, err := h.repo.ListQuestions(r.Context(), tenantID, examID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "list_questions_failed"})
			return
		}
		writeJSON(w, 200, map[string][]ExamQuestion{"data": items})
	case http.MethodPost:
		var p CreateExamQuestionParams
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeQuestion(p)
		if err := validateQuestion(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.CreateQuestion(r.Context(), tenantID, examID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "create_question_failed"})
			return
		}
		writeJSON(w, 201, item)
	case http.MethodPatch:
		if examID == "" {
			writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
			return
		}
		var p CreateExamParams
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeExam(p)
		if err := validateExam(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.UpdateExam(r.Context(), tenantID, examID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "update_exam_failed"})
			return
		}
		writeJSON(w, 200, item)
	case http.MethodDelete:
		if examID == "" {
			writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
			return
		}
		if err := h.repo.DeleteExam(r.Context(), tenantID, examID); err != nil {
			writeJSON(w, 500, map[string]string{"error": "delete_exam_failed"})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
	}
}
func (h ManagementHandler) handleTargets(w http.ResponseWriter, r *http.Request, tenantID, examID string) {
	switch r.Method {
	case http.MethodGet:
		items, err := h.repo.ListTargets(r.Context(), tenantID, examID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "list_targets_failed"})
			return
		}
		writeJSON(w, 200, map[string][]ExamTarget{"data": items})
	case http.MethodPost:
		var p CreateExamTargetParams
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeTarget(p)
		if err := validateTarget(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.CreateTarget(r.Context(), tenantID, examID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "create_target_failed"})
			return
		}
		writeJSON(w, 201, item)
	case http.MethodPatch:
		if examID == "" {
			writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
			return
		}
		var p CreateExamParams
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeExam(p)
		if err := validateExam(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.UpdateExam(r.Context(), tenantID, examID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "update_exam_failed"})
			return
		}
		writeJSON(w, 200, item)
	case http.MethodDelete:
		if examID == "" {
			writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
			return
		}
		if err := h.repo.DeleteExam(r.Context(), tenantID, examID); err != nil {
			writeJSON(w, 500, map[string]string{"error": "delete_exam_failed"})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
	}
}
func (h ManagementHandler) handleGateWindows(w http.ResponseWriter, r *http.Request, tenantID, examID string) {
	switch r.Method {
	case http.MethodGet:
		items, err := h.repo.ListGateWindows(r.Context(), tenantID, examID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "list_gate_windows_failed"})
			return
		}
		writeJSON(w, 200, map[string][]ExamGateWindow{"data": items})
	case http.MethodPost:
		var p CreateExamGateWindowParams
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeGateWindow(p)
		if err := validateGateWindow(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.CreateGateWindow(r.Context(), tenantID, examID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "create_gate_window_failed"})
			return
		}
		writeJSON(w, 201, item)
	case http.MethodPatch:
		if examID == "" {
			writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
			return
		}
		var p CreateExamParams
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeExam(p)
		if err := validateExam(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.UpdateExam(r.Context(), tenantID, examID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "update_exam_failed"})
			return
		}
		writeJSON(w, 200, item)
	case http.MethodDelete:
		if examID == "" {
			writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
			return
		}
		if err := h.repo.DeleteExam(r.Context(), tenantID, examID); err != nil {
			writeJSON(w, 500, map[string]string{"error": "delete_exam_failed"})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
	}
}
func (h ManagementHandler) handlePrerequisites(w http.ResponseWriter, r *http.Request, tenantID, examID string) {
	switch r.Method {
	case http.MethodGet:
		items, err := h.repo.ListPrerequisites(r.Context(), tenantID, examID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "list_prerequisites_failed"})
			return
		}
		writeJSON(w, 200, map[string][]ExamPrerequisite{"data": items})
	case http.MethodPost:
		var p CreateExamPrerequisiteParams
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizePrerequisite(p)
		if err := validatePrerequisite(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.CreatePrerequisite(r.Context(), tenantID, examID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "create_prerequisite_failed"})
			return
		}
		writeJSON(w, 201, item)
	case http.MethodPatch:
		if examID == "" {
			writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
			return
		}
		var p CreateExamParams
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeExam(p)
		if err := validateExam(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.UpdateExam(r.Context(), tenantID, examID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "update_exam_failed"})
			return
		}
		writeJSON(w, 200, item)
	case http.MethodDelete:
		if examID == "" {
			writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
			return
		}
		if err := h.repo.DeleteExam(r.Context(), tenantID, examID); err != nil {
			writeJSON(w, 500, map[string]string{"error": "delete_exam_failed"})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
	}
}

func normalizeExam(p CreateExamParams) CreateExamParams {
	p.Title = strings.TrimSpace(p.Title)
	p.SubjectName = strings.TrimSpace(p.SubjectName)
	p.Status = strings.ToLower(strings.TrimSpace(p.Status))
	if p.Status == "" {
		p.Status = "draft"
	}
	p.SecurityMode = strings.ToLower(strings.TrimSpace(p.SecurityMode))
	if p.SecurityMode == "" {
		p.SecurityMode = "secure_required"
	}
	p.CreatedBy = strings.TrimSpace(p.CreatedBy)
	return p
}
func validateExam(p CreateExamParams) error {
	if len(p.Title) < 2 {
		return errors.New("title_too_short")
	}
	if p.SubjectName == "" {
		return errors.New("subject_required")
	}
	if p.DurationMinutes <= 0 {
		return errors.New("duration_required")
	}
	switch p.Status {
	case "draft", "scheduled", "running", "completed", "archived":
	default:
		return errors.New("invalid_status")
	}
	switch p.SecurityMode {
	case "secure_required", "unsecure_allowed":
		return nil
	default:
		return errors.New("invalid_security_mode")
	}
}
func normalizeQuestion(p CreateExamQuestionParams) CreateExamQuestionParams {
	p.QuestionType = strings.ToLower(strings.TrimSpace(p.QuestionType))
	p.Prompt = strings.TrimSpace(p.Prompt)
	p.Rubric = strings.TrimSpace(p.Rubric)
	if p.Position < 1 {
		p.Position = 1
	}
	if p.Points < 1 {
		p.Points = 1
	}
	for i := range p.Options {
		p.Options[i].ID = strings.TrimSpace(p.Options[i].ID)
		p.Options[i].Text = strings.TrimSpace(p.Options[i].Text)
	}
	return p
}
func validateQuestion(p CreateExamQuestionParams) error {
	if len(p.Prompt) < 2 {
		return errors.New("prompt_too_short")
	}
	switch p.QuestionType {
	case "multiple_choice":
		hasCorrect := false
		for _, o := range p.Options {
			if o.Text == "" {
				return errors.New("option_text_required")
			}
			if o.IsCorrect {
				hasCorrect = true
			}
		}
		if !hasCorrect {
			return errors.New("correct_option_required")
		}
		return nil
	case "short_answer", "essay":
		return nil
	default:
		return errors.New("invalid_question_type")
	}
}
func normalizeTarget(p CreateExamTargetParams) CreateExamTargetParams {
	p.TargetType = strings.ToLower(strings.TrimSpace(p.TargetType))
	p.TargetID = strings.TrimSpace(p.TargetID)
	return p
}
func validateTarget(p CreateExamTargetParams) error {
	switch p.TargetType {
	case "class_section", "subject_group", "student":
		if p.TargetID == "" {
			return errors.New("target_required")
		}
		return nil
	default:
		return errors.New("invalid_target_type")
	}
}
func normalizeGateWindow(p CreateExamGateWindowParams) CreateExamGateWindowParams {
	p.TargetType = strings.ToLower(strings.TrimSpace(p.TargetType))
	if p.TargetType == "" {
		p.TargetType = "global"
	}
	p.TargetID = strings.TrimSpace(p.TargetID)
	p.PublishesAt = strings.TrimSpace(p.PublishesAt)
	p.OpensAt = strings.TrimSpace(p.OpensAt)
	p.ClosesAt = strings.TrimSpace(p.ClosesAt)
	p.Password = strings.TrimSpace(p.Password)
	return p
}
func validateGateWindow(p CreateExamGateWindowParams) error {
	switch p.TargetType {
	case "global", "class_section", "subject_group", "student":
	default:
		return errors.New("invalid_target_type")
	}
	open, err := time.Parse(time.RFC3339, p.OpensAt)
	if err != nil {
		return errors.New("invalid_opens_at")
	}
	closeAt, err := time.Parse(time.RFC3339, p.ClosesAt)
	if err != nil {
		return errors.New("invalid_closes_at")
	}
	if !closeAt.After(open) {
		return errors.New("closes_at_must_be_after_opens_at")
	}
	if p.PublishesAt != "" {
		if _, err := time.Parse(time.RFC3339, p.PublishesAt); err != nil {
			return errors.New("invalid_publishes_at")
		}
	}
	return nil
}
func normalizePrerequisite(p CreateExamPrerequisiteParams) CreateExamPrerequisiteParams {
	p.PrerequisiteType = strings.ToLower(strings.TrimSpace(p.PrerequisiteType))
	p.RequiredID = strings.TrimSpace(p.RequiredID)
	return p
}
func validatePrerequisite(p CreateExamPrerequisiteParams) error {
	switch p.PrerequisiteType {
	case "course_completed", "exam_completed":
		if p.RequiredID == "" {
			return errors.New("required_id_required")
		}
		return nil
	default:
		return errors.New("invalid_prerequisite_type")
	}
}
