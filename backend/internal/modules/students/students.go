package students

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type Student struct {
	ID              string `json:"id"`
	UserID          string `json:"userId,omitempty"`
	NISN            string `json:"nisn"`
	Name            string `json:"name"`
	Email           string `json:"email,omitempty"`
	Status          string `json:"status"`
	GuardianName    string `json:"guardianName"`
	GuardianContact string `json:"guardianPhone"`
	ClassSectionID  string `json:"classSectionId,omitempty"`
	ClassSection    string `json:"classSection,omitempty"`
}

type StudentParams struct {
	NISN            string `json:"nisn"`
	Name            string `json:"name"`
	Email           string `json:"email"`
	Status          string `json:"status"`
	GuardianName    string `json:"guardianName"`
	GuardianContact string `json:"guardianPhone"`
	ClassSectionID  string `json:"classSectionId"`
	ClassSection    string `json:"classSection"`
}

type Repository interface {
	ListStudents(ctx context.Context, tenantID string) ([]Student, error)
	CreateStudent(ctx context.Context, tenantID string, params StudentParams) (Student, error)
	UpdateStudent(ctx context.Context, tenantID string, studentID string, params StudentParams) (Student, error)
	DeleteStudent(ctx context.Context, tenantID string, studentID string) error
}

type Handler struct{ repo Repository }

func NewHandler(repo Repository) http.Handler { return Handler{repo: repo} }

func (handler Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	id := extractBetween(r.URL.Path, "/api/v1/students/", "")

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
	items, err := handler.repo.ListStudents(r.Context(), tenantID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list_students_failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string][]Student{"data": items})
}

func (handler Handler) create(w http.ResponseWriter, r *http.Request, tenantID string) {
	params, ok := decodeParams(w, r)
	if !ok {
		return
	}
	item, err := handler.repo.CreateStudent(r.Context(), tenantID, params)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "create_student_failed"})
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (handler Handler) update(w http.ResponseWriter, r *http.Request, tenantID string, id string) {
	params, ok := decodeParams(w, r)
	if !ok {
		return
	}
	item, err := handler.repo.UpdateStudent(r.Context(), tenantID, id, params)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "update_student_failed"})
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (handler Handler) delete(w http.ResponseWriter, r *http.Request, tenantID string, id string) {
	if err := handler.repo.DeleteStudent(r.Context(), tenantID, id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "delete_student_failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func decodeParams(w http.ResponseWriter, r *http.Request) (StudentParams, bool) {
	var params StudentParams
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

func normalizeParams(params StudentParams) StudentParams {
	params.NISN = strings.TrimSpace(params.NISN)
	params.Name = strings.TrimSpace(params.Name)
	params.Email = strings.ToLower(strings.TrimSpace(params.Email))
	params.Status = strings.TrimSpace(params.Status)
	if params.Status == "" {
		params.Status = "active"
	}
	params.GuardianName = strings.TrimSpace(params.GuardianName)
	params.GuardianContact = strings.TrimSpace(params.GuardianContact)
	params.ClassSectionID = strings.TrimSpace(params.ClassSectionID)
	params.ClassSection = strings.TrimSpace(params.ClassSection)
	return params
}

func validateParams(params StudentParams) error {
	if len(params.NISN) < 4 {
		return errors.New("nisn_too_short")
	}
	if len(params.Name) < 3 {
		return errors.New("name_too_short")
	}
	switch params.Status {
	case "active", "inactive", "graduated":
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
