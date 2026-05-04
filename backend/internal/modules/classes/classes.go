package classes

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type ClassSection struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	GradeLevel      string   `json:"gradeLevel"`
	AcademicYear    string   `json:"academicYear"`
	HomeroomTeacher string   `json:"homeroomTeacher"`
	Status          string   `json:"status"`
	StudentIds      []string `json:"studentIds"`
}

type ClassSectionParams struct {
	Name            string   `json:"name"`
	GradeLevel      string   `json:"gradeLevel"`
	AcademicYear    string   `json:"academicYear"`
	HomeroomTeacher string   `json:"homeroomTeacher"`
	Status          string   `json:"status"`
	StudentIds      []string `json:"studentIds"`
}

type Repository interface {
	ListClasses(ctx context.Context, tenantID string) ([]ClassSection, error)
	CreateClass(ctx context.Context, tenantID string, params ClassSectionParams) (ClassSection, error)
	UpdateClass(ctx context.Context, tenantID string, classID string, params ClassSectionParams) (ClassSection, error)
	DeleteClass(ctx context.Context, tenantID string, classID string) error
}

type Handler struct{ repo Repository }

func NewHandler(repo Repository) http.Handler { return Handler{repo: repo} }

func (handler Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	id := extractBetween(r.URL.Path, "/api/v1/classes/", "")

	switch r.Method {
	case http.MethodGet:
		handler.list(w, r, tenantID)
	case http.MethodPost:
		handler.create(w, r, tenantID)
	case http.MethodPatch:
		if id == "" {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		handler.update(w, r, tenantID, id)
	case http.MethodDelete:
		if id == "" {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
			return
		}
		handler.delete(w, r, tenantID, id)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
	}
}

func (handler Handler) list(w http.ResponseWriter, r *http.Request, tenantID string) {
	items, err := handler.repo.ListClasses(r.Context(), tenantID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list_classes_failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string][]ClassSection{"data": items})
}

func (handler Handler) create(w http.ResponseWriter, r *http.Request, tenantID string) {
	params, ok := decodeParams(w, r)
	if !ok {
		return
	}
	item, err := handler.repo.CreateClass(r.Context(), tenantID, params)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "create_class_failed"})
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (handler Handler) update(w http.ResponseWriter, r *http.Request, tenantID string, id string) {
	params, ok := decodeParams(w, r)
	if !ok {
		return
	}
	item, err := handler.repo.UpdateClass(r.Context(), tenantID, id, params)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "update_class_failed"})
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (handler Handler) delete(w http.ResponseWriter, r *http.Request, tenantID string, id string) {
	if err := handler.repo.DeleteClass(r.Context(), tenantID, id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "delete_class_failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func decodeParams(w http.ResponseWriter, r *http.Request) (ClassSectionParams, bool) {
	var params ClassSectionParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return params, false
	}
	params = normalizeParams(params)
	if err := validateParams(params); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return params, false
	}
	return params, true
}

func normalizeParams(params ClassSectionParams) ClassSectionParams {
	params.Name = strings.TrimSpace(params.Name)
	params.GradeLevel = strings.TrimSpace(params.GradeLevel)
	params.AcademicYear = strings.TrimSpace(params.AcademicYear)
	params.HomeroomTeacher = strings.TrimSpace(params.HomeroomTeacher)
	params.Status = strings.TrimSpace(params.Status)
	if params.Status == "" {
		params.Status = "active"
	}
	return params
}

func validateParams(params ClassSectionParams) error {
	if len(params.Name) < 1 {
		return errors.New("name_required")
	}
	if len(params.GradeLevel) < 1 {
		return errors.New("grade_level_required")
	}
	if len(params.AcademicYear) < 4 {
		return errors.New("academic_year_invalid")
	}
	switch params.Status {
	case "active", "inactive":
		return nil
	default:
		return errors.New("invalid_status")
	}
}

func extractBetween(path, prefix, suffix string) string {
	trimmed := strings.TrimPrefix(path, prefix)
	if suffix != "" {
		trimmed = strings.TrimSuffix(trimmed, suffix)
	}
	return strings.TrimSpace(trimmed)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
