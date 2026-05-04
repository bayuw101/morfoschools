package academic

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type Subject struct {
	ID        string `json:"id"`
	Code      string `json:"code"`
	Name      string `json:"name"`
	GroupName string `json:"groupName"`
	Status    string `json:"status"`
}

type CreateSubjectParams struct {
	Code      string `json:"code"`
	Name      string `json:"name"`
	GroupName string `json:"groupName"`
}

type CourseOffering struct {
	ID             string `json:"id"`
	SubjectID      string `json:"subjectId"`
	SubjectName    string `json:"subjectName,omitempty"`
	ClassSectionID string `json:"classSectionId"`
	ClassName      string `json:"className,omitempty"`
	AcademicYear   string `json:"academicYear"`
	Term           string `json:"term"`
	Status         string `json:"status"`
}

type CreateCourseOfferingParams struct {
	SubjectID      string `json:"subjectId"`
	ClassSectionID string `json:"classSectionId"`
	AcademicYear   string `json:"academicYear"`
	Term           string `json:"term"`
}

type TeachingAssignment struct {
	ID               string `json:"id"`
	CourseOfferingID string `json:"courseOfferingId"`
	TeacherID        string `json:"teacherId"`
	TeacherName      string `json:"teacherName,omitempty"`
	Role             string `json:"role"`
	Status           string `json:"status"`
}

type CreateTeachingAssignmentParams struct {
	CourseOfferingID string `json:"courseOfferingId"`
	TeacherID        string `json:"teacherId"`
	Role             string `json:"role"`
}

type Repository interface {
	ListSubjects(ctx context.Context, tenantID string) ([]Subject, error)
	CreateSubject(ctx context.Context, tenantID string, params CreateSubjectParams) (Subject, error)
	ListCourseOfferings(ctx context.Context, tenantID string) ([]CourseOffering, error)
	CreateCourseOffering(ctx context.Context, tenantID string, params CreateCourseOfferingParams) (CourseOffering, error)
	ListTeachingAssignments(ctx context.Context, tenantID string) ([]TeachingAssignment, error)
	CreateTeachingAssignment(ctx context.Context, tenantID string, params CreateTeachingAssignmentParams) (TeachingAssignment, error)
}

type Handler struct {
	repo Repository
}

func NewHandler(repo Repository) http.Handler {
	return Handler{repo: repo}
}

func (handler Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}

	path := strings.TrimSuffix(r.URL.Path, "/")
	switch path {
	case "/api/v1/academic/subjects":
		handler.handleSubjects(w, r, tenantID)
	case "/api/v1/academic/course-offerings":
		handler.handleCourseOfferings(w, r, tenantID)
	case "/api/v1/academic/teaching-assignments":
		handler.handleTeachingAssignments(w, r, tenantID)
	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	}
}

func (handler Handler) handleSubjects(w http.ResponseWriter, r *http.Request, tenantID string) {
	switch r.Method {
	case http.MethodGet:
		items, err := handler.repo.ListSubjects(r.Context(), tenantID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list_subjects_failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string][]Subject{"data": items})
	case http.MethodPost:
		var params CreateSubjectParams
		if err := decodeJSON(r, &params); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		params = normalizeSubject(params)
		if err := validateSubject(params); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		item, err := handler.repo.CreateSubject(r.Context(), tenantID, params)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "create_subject_failed"})
			return
		}
		writeJSON(w, http.StatusCreated, item)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
	}
}

func (handler Handler) handleCourseOfferings(w http.ResponseWriter, r *http.Request, tenantID string) {
	switch r.Method {
	case http.MethodGet:
		items, err := handler.repo.ListCourseOfferings(r.Context(), tenantID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list_course_offerings_failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string][]CourseOffering{"data": items})
	case http.MethodPost:
		var params CreateCourseOfferingParams
		if err := decodeJSON(r, &params); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		params = normalizeCourseOffering(params)
		if err := validateCourseOffering(params); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		item, err := handler.repo.CreateCourseOffering(r.Context(), tenantID, params)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "create_course_offering_failed"})
			return
		}
		writeJSON(w, http.StatusCreated, item)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
	}
}

func (handler Handler) handleTeachingAssignments(w http.ResponseWriter, r *http.Request, tenantID string) {
	switch r.Method {
	case http.MethodGet:
		items, err := handler.repo.ListTeachingAssignments(r.Context(), tenantID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list_teaching_assignments_failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string][]TeachingAssignment{"data": items})
	case http.MethodPost:
		var params CreateTeachingAssignmentParams
		if err := decodeJSON(r, &params); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
			return
		}
		params = normalizeTeachingAssignment(params)
		if err := validateTeachingAssignment(params); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		item, err := handler.repo.CreateTeachingAssignment(r.Context(), tenantID, params)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "create_teaching_assignment_failed"})
			return
		}
		writeJSON(w, http.StatusCreated, item)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
	}
}

func normalizeSubject(params CreateSubjectParams) CreateSubjectParams {
	params.Code = strings.ToUpper(strings.TrimSpace(params.Code))
	params.Name = strings.TrimSpace(params.Name)
	params.GroupName = strings.TrimSpace(params.GroupName)
	if params.GroupName == "" {
		params.GroupName = "Umum"
	}
	return params
}

func validateSubject(params CreateSubjectParams) error {
	if len(params.Code) < 2 {
		return errors.New("code_too_short")
	}
	if len(params.Name) < 2 {
		return errors.New("name_too_short")
	}
	return nil
}

func normalizeCourseOffering(params CreateCourseOfferingParams) CreateCourseOfferingParams {
	params.SubjectID = strings.TrimSpace(params.SubjectID)
	params.ClassSectionID = strings.TrimSpace(params.ClassSectionID)
	params.AcademicYear = strings.TrimSpace(params.AcademicYear)
	params.Term = strings.ToLower(strings.TrimSpace(params.Term))
	return params
}

func validateCourseOffering(params CreateCourseOfferingParams) error {
	if params.SubjectID == "" {
		return errors.New("subject_required")
	}
	if params.ClassSectionID == "" {
		return errors.New("class_section_required")
	}
	if len(params.AcademicYear) < 4 {
		return errors.New("academic_year_required")
	}
	switch params.Term {
	case "ganjil", "genap", "full_year":
		return nil
	default:
		return errors.New("invalid_term")
	}
}

func normalizeTeachingAssignment(params CreateTeachingAssignmentParams) CreateTeachingAssignmentParams {
	params.CourseOfferingID = strings.TrimSpace(params.CourseOfferingID)
	params.TeacherID = strings.TrimSpace(params.TeacherID)
	params.Role = strings.ToLower(strings.TrimSpace(params.Role))
	return params
}

func validateTeachingAssignment(params CreateTeachingAssignmentParams) error {
	if params.CourseOfferingID == "" {
		return errors.New("course_offering_required")
	}
	if params.TeacherID == "" {
		return errors.New("teacher_required")
	}
	switch params.Role {
	case "primary", "assistant":
		return nil
	default:
		return errors.New("invalid_assignment_role")
	}
}

func decodeJSON(r *http.Request, payload any) error {
	return json.NewDecoder(r.Body).Decode(payload)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
