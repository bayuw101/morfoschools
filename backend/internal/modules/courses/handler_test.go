package courses

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type fakeCourseRepository struct {
	courses          []Course
	modules          []CourseModule
	resources        []CourseResource
	progressEvents   []CourseProgressEvent
	capturedTenant   string
	capturedCourse   CreateCourseParams
	capturedModule   CreateCourseModuleParams
	capturedResource CreateCourseResourceParams
	capturedProgress CreateCourseProgressEventParams
	capturedCourseID string
	capturedModuleID string
	err              error
}

func (repo *fakeCourseRepository) ListCourses(ctx context.Context, tenantID string) ([]Course, error) {
	repo.capturedTenant = tenantID
	return repo.courses, repo.err
}
func (repo *fakeCourseRepository) CreateCourse(ctx context.Context, tenantID string, params CreateCourseParams) (Course, error) {
	repo.capturedTenant = tenantID
	repo.capturedCourse = params
	if repo.err != nil {
		return Course{}, repo.err
	}
	return Course{ID: "course-1", CourseOfferingID: params.CourseOfferingID, Title: params.Title, Description: params.Description, Status: "draft"}, nil
}
func (repo *fakeCourseRepository) ListModules(ctx context.Context, tenantID, courseID string) ([]CourseModule, error) {
	repo.capturedTenant = tenantID
	repo.capturedCourseID = courseID
	return repo.modules, repo.err
}
func (repo *fakeCourseRepository) CreateModule(ctx context.Context, tenantID, courseID string, params CreateCourseModuleParams) (CourseModule, error) {
	repo.capturedTenant = tenantID
	repo.capturedCourseID = courseID
	repo.capturedModule = params
	if repo.err != nil {
		return CourseModule{}, repo.err
	}
	return CourseModule{ID: "module-1", CourseID: courseID, Title: params.Title, Position: params.Position, Status: "draft"}, nil
}
func (repo *fakeCourseRepository) ListResources(ctx context.Context, tenantID, moduleID string) ([]CourseResource, error) {
	repo.capturedTenant = tenantID
	repo.capturedModuleID = moduleID
	return repo.resources, repo.err
}
func (repo *fakeCourseRepository) CreateResource(ctx context.Context, tenantID, moduleID string, params CreateCourseResourceParams) (CourseResource, error) {
	repo.capturedTenant = tenantID
	repo.capturedModuleID = moduleID
	repo.capturedResource = params
	if repo.err != nil {
		return CourseResource{}, repo.err
	}
	return CourseResource{ID: "resource-1", ModuleID: moduleID, ResourceType: params.ResourceType, Title: params.Title, ExternalURL: params.ExternalURL, Provider: params.Provider, Position: params.Position, Status: "active"}, nil
}
func (repo *fakeCourseRepository) RecordProgressEvent(ctx context.Context, tenantID string, params CreateCourseProgressEventParams) (CourseProgressEvent, error) {
	repo.capturedTenant = tenantID
	repo.capturedProgress = params
	if repo.err != nil {
		return CourseProgressEvent{}, repo.err
	}
	return CourseProgressEvent{ID: "event-1", CourseID: params.CourseID, ModuleID: params.ModuleID, ResourceID: params.ResourceID, StudentID: params.StudentID, EventType: params.EventType}, nil
}

func TestCourseRoutesRequireTenantContext(t *testing.T) {
	handler := NewHandler(&fakeCourseRepository{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/courses", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestListCoursesReturnsTenantScopedCourses(t *testing.T) {
	repo := &fakeCourseRepository{courses: []Course{{ID: "course-1", CourseOfferingID: "offering-1", Title: "Aljabar Dasar", Status: "published", ModuleCount: 3}}}
	handler := tenantctx.Middleware(NewHandler(repo))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/courses", nil)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedTenant != "tenant-1" {
		t.Fatalf("expected tenant-1, got %q", repo.capturedTenant)
	}
	var payload struct {
		Data []Course `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if len(payload.Data) != 1 || payload.Data[0].ModuleCount != 3 {
		t.Fatalf("unexpected payload: %+v", payload.Data)
	}
}

func TestCreateCourseNormalizesTitleAndStatus(t *testing.T) {
	repo := &fakeCourseRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := `{"courseOfferingId":"offering-1","title":" Aljabar Dasar ","description":" Intro ","status":" Published "}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/courses", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedCourse.CourseOfferingID != "offering-1" || repo.capturedCourse.Title != "Aljabar Dasar" || repo.capturedCourse.Status != "published" {
		t.Fatalf("unexpected course params: %+v", repo.capturedCourse)
	}
}

func TestCreateCourseRejectsShortTitle(t *testing.T) {
	handler := tenantctx.Middleware(NewHandler(&fakeCourseRepository{}))
	body := `{"courseOfferingId":"offering-1","title":"A"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/courses", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestCreateModuleCapturesCourseID(t *testing.T) {
	repo := &fakeCourseRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := `{"title":" Bab 1 ","position":2,"status":"published"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/courses/course-1/modules", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedCourseID != "course-1" || repo.capturedModule.Title != "Bab 1" || repo.capturedModule.Position != 2 {
		t.Fatalf("unexpected module capture: %+v", repo)
	}
}

func TestCreateResourceValidatesExternalProvider(t *testing.T) {
	repo := &fakeCourseRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := `{"resourceType":"video","title":"Video Pembuka","externalUrl":"https://youtube.com/watch?v=abc","provider":"youtube","position":1}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/course-modules/module-1/resources", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedModuleID != "module-1" || repo.capturedResource.Provider != "youtube" || repo.capturedResource.ResourceType != "video" {
		t.Fatalf("unexpected resource capture: %+v", repo.capturedResource)
	}
}

func TestCreateResourceRejectsUnsupportedProvider(t *testing.T) {
	handler := tenantctx.Middleware(NewHandler(&fakeCourseRepository{}))
	body := `{"resourceType":"video","title":"Video","externalUrl":"https://example.com","provider":"vimeo"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/course-modules/module-1/resources", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRecordProgressEventCapturesEvidenceTrail(t *testing.T) {
	repo := &fakeCourseRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := `{"courseId":"course-1","moduleId":"module-1","resourceId":"resource-1","studentId":"student-1","eventType":"completed","metadata":{"source":"student_click"}}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/course-progress-events", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedProgress.CourseID != "course-1" || repo.capturedProgress.EventType != "completed" || repo.capturedProgress.Metadata["source"] != "student_click" {
		t.Fatalf("unexpected progress capture: %+v", repo.capturedProgress)
	}
}

func TestRecordProgressEventRejectsInvalidEventType(t *testing.T) {
	handler := tenantctx.Middleware(NewHandler(&fakeCourseRepository{}))
	body := `{"courseId":"course-1","studentId":"student-1","eventType":"liked"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/course-progress-events", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}
