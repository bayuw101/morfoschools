package courses

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type Course struct {
	ID               string `json:"id"`
	CourseOfferingID string `json:"courseOfferingId"`
	Title            string `json:"title"`
	Description      string `json:"description"`
	Status           string `json:"status"`
	ModuleCount      int    `json:"moduleCount"`
}

type CreateCourseParams struct {
	CourseOfferingID string `json:"courseOfferingId"`
	Title            string `json:"title"`
	Description      string `json:"description"`
	Status           string `json:"status"`
}

type CourseModule struct {
	ID       string `json:"id"`
	CourseID string `json:"courseId"`
	Title    string `json:"title"`
	Position int    `json:"position"`
	Status   string `json:"status"`
}

type CreateCourseModuleParams struct {
	Title    string `json:"title"`
	Position int    `json:"position"`
	Status   string `json:"status"`
}

type CourseResource struct {
	ID           string `json:"id"`
	ModuleID     string `json:"moduleId"`
	ResourceType string `json:"resourceType"`
	Title        string `json:"title"`
	ExternalURL  string `json:"externalUrl"`
	Provider     string `json:"provider"`
	Position     int    `json:"position"`
	Status       string `json:"status"`
}

type CreateCourseResourceParams struct {
	ResourceType string `json:"resourceType"`
	Title        string `json:"title"`
	ExternalURL  string `json:"externalUrl"`
	Provider     string `json:"provider"`
	Position     int    `json:"position"`
}

type CourseProgressEvent struct {
	ID         string         `json:"id"`
	CourseID   string         `json:"courseId"`
	ModuleID   string         `json:"moduleId,omitempty"`
	ResourceID string         `json:"resourceId,omitempty"`
	StudentID  string         `json:"studentId"`
	EventType  string         `json:"eventType"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

type CreateCourseProgressEventParams struct {
	CourseID   string         `json:"courseId"`
	ModuleID   string         `json:"moduleId"`
	ResourceID string         `json:"resourceId"`
	StudentID  string         `json:"studentId"`
	EventType  string         `json:"eventType"`
	Metadata   map[string]any `json:"metadata"`
}

type Repository interface {
	ListCourses(ctx context.Context, tenantID string) ([]Course, error)
	CreateCourse(ctx context.Context, tenantID string, params CreateCourseParams) (Course, error)
	ListModules(ctx context.Context, tenantID, courseID string) ([]CourseModule, error)
	CreateModule(ctx context.Context, tenantID, courseID string, params CreateCourseModuleParams) (CourseModule, error)
	ListResources(ctx context.Context, tenantID, moduleID string) ([]CourseResource, error)
	CreateResource(ctx context.Context, tenantID, moduleID string, params CreateCourseResourceParams) (CourseResource, error)
	RecordProgressEvent(ctx context.Context, tenantID string, params CreateCourseProgressEventParams) (CourseProgressEvent, error)
}

type Handler struct{ repo Repository }

func NewHandler(repo Repository) http.Handler { return Handler{repo: repo} }

func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/")
	switch {
	case path == "/api/v1/courses":
		h.handleCourses(w, r, tenantID)
	case strings.HasPrefix(path, "/api/v1/courses/") && strings.HasSuffix(path, "/modules"):
		h.handleModules(w, r, tenantID, extractBetween(path, "/api/v1/courses/", "/modules"))
	case strings.HasPrefix(path, "/api/v1/course-modules/") && strings.HasSuffix(path, "/resources"):
		h.handleResources(w, r, tenantID, extractBetween(path, "/api/v1/course-modules/", "/resources"))
	case path == "/api/v1/course-progress-events":
		h.handleProgress(w, r, tenantID)
	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	}
}

func (h Handler) handleCourses(w http.ResponseWriter, r *http.Request, tenantID string) {
	switch r.Method {
	case http.MethodGet:
		items, err := h.repo.ListCourses(r.Context(), tenantID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "list_courses_failed"})
			return
		}
		writeJSON(w, 200, map[string][]Course{"data": items})
	case http.MethodPost:
		var p CreateCourseParams
		if decodeJSON(r, &p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeCourse(p)
		if err := validateCourse(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.CreateCourse(r.Context(), tenantID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "create_course_failed"})
			return
		}
		writeJSON(w, 201, item)
	default:
		writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
	}
}

func (h Handler) handleModules(w http.ResponseWriter, r *http.Request, tenantID, courseID string) {
	if courseID == "" {
		writeJSON(w, 404, map[string]string{"error": "not_found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		items, err := h.repo.ListModules(r.Context(), tenantID, courseID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "list_modules_failed"})
			return
		}
		writeJSON(w, 200, map[string][]CourseModule{"data": items})
	case http.MethodPost:
		var p CreateCourseModuleParams
		if decodeJSON(r, &p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeModule(p)
		if err := validateModule(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.CreateModule(r.Context(), tenantID, courseID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "create_module_failed"})
			return
		}
		writeJSON(w, 201, item)
	default:
		writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
	}
}

func (h Handler) handleResources(w http.ResponseWriter, r *http.Request, tenantID, moduleID string) {
	if moduleID == "" {
		writeJSON(w, 404, map[string]string{"error": "not_found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		items, err := h.repo.ListResources(r.Context(), tenantID, moduleID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "list_resources_failed"})
			return
		}
		writeJSON(w, 200, map[string][]CourseResource{"data": items})
	case http.MethodPost:
		var p CreateCourseResourceParams
		if decodeJSON(r, &p) != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid_json"})
			return
		}
		p = normalizeResource(p)
		if err := validateResource(p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := h.repo.CreateResource(r.Context(), tenantID, moduleID, p)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "create_resource_failed"})
			return
		}
		writeJSON(w, 201, item)
	default:
		writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
	}
}

func (h Handler) handleProgress(w http.ResponseWriter, r *http.Request, tenantID string) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method_not_allowed"})
		return
	}
	var p CreateCourseProgressEventParams
	if decodeJSON(r, &p) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid_json"})
		return
	}
	p = normalizeProgress(p)
	if err := validateProgress(p); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	item, err := h.repo.RecordProgressEvent(r.Context(), tenantID, p)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": "record_progress_failed"})
		return
	}
	writeJSON(w, 201, item)
}

func extractBetween(path, prefix, suffix string) string {
	return strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(path, prefix), suffix))
}

func normalizeCourse(p CreateCourseParams) CreateCourseParams {
	p.CourseOfferingID = strings.TrimSpace(p.CourseOfferingID)
	p.Title = strings.TrimSpace(p.Title)
	p.Description = strings.TrimSpace(p.Description)
	p.Status = strings.ToLower(strings.TrimSpace(p.Status))
	if p.Status == "" {
		p.Status = "draft"
	}
	return p
}
func validateCourse(p CreateCourseParams) error {
	if p.CourseOfferingID == "" {
		return errors.New("course_offering_required")
	}
	if len(p.Title) < 2 {
		return errors.New("title_too_short")
	}
	switch p.Status {
	case "draft", "published", "archived":
		return nil
	default:
		return errors.New("invalid_status")
	}
}
func normalizeModule(p CreateCourseModuleParams) CreateCourseModuleParams {
	p.Title = strings.TrimSpace(p.Title)
	p.Status = strings.ToLower(strings.TrimSpace(p.Status))
	if p.Status == "" {
		p.Status = "draft"
	}
	if p.Position < 1 {
		p.Position = 1
	}
	return p
}
func validateModule(p CreateCourseModuleParams) error {
	if len(p.Title) < 2 {
		return errors.New("title_too_short")
	}
	switch p.Status {
	case "draft", "published", "archived":
		return nil
	default:
		return errors.New("invalid_status")
	}
}
func normalizeResource(p CreateCourseResourceParams) CreateCourseResourceParams {
	p.ResourceType = strings.ToLower(strings.TrimSpace(p.ResourceType))
	p.Title = strings.TrimSpace(p.Title)
	p.ExternalURL = strings.TrimSpace(p.ExternalURL)
	p.Provider = strings.ToLower(strings.TrimSpace(p.Provider))
	if p.Position < 1 {
		p.Position = 1
	}
	return p
}
func validateResource(p CreateCourseResourceParams) error {
	if len(p.Title) < 2 {
		return errors.New("title_too_short")
	}
	switch p.ResourceType {
	case "video", "document", "link", "text":
	default:
		return errors.New("invalid_resource_type")
	}
	switch p.Provider {
	case "youtube", "google_drive", "external", "inline":
		return nil
	default:
		return errors.New("invalid_provider")
	}
}
func normalizeProgress(p CreateCourseProgressEventParams) CreateCourseProgressEventParams {
	p.CourseID = strings.TrimSpace(p.CourseID)
	p.ModuleID = strings.TrimSpace(p.ModuleID)
	p.ResourceID = strings.TrimSpace(p.ResourceID)
	p.StudentID = strings.TrimSpace(p.StudentID)
	p.EventType = strings.ToLower(strings.TrimSpace(p.EventType))
	if p.Metadata == nil {
		p.Metadata = map[string]any{}
	}
	return p
}
func validateProgress(p CreateCourseProgressEventParams) error {
	if p.CourseID == "" {
		return errors.New("course_required")
	}
	if p.StudentID == "" {
		return errors.New("student_required")
	}
	switch p.EventType {
	case "opened", "viewed", "downloaded", "completed":
		return nil
	default:
		return errors.New("invalid_event_type")
	}
}

func decodeJSON(r *http.Request, payload any) error { return json.NewDecoder(r.Body).Decode(payload) }
func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
