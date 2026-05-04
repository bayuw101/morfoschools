package academic

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type fakeAcademicRepository struct {
	subjects            []Subject
	courseOfferings     []CourseOffering
	teachingAssignments []TeachingAssignment
	capturedTenant      string
	capturedSubject     CreateSubjectParams
	capturedOffering    CreateCourseOfferingParams
	capturedAssignment  CreateTeachingAssignmentParams
	err                 error
}

func (repo *fakeAcademicRepository) ListSubjects(ctx context.Context, tenantID string) ([]Subject, error) {
	repo.capturedTenant = tenantID
	return repo.subjects, repo.err
}

func (repo *fakeAcademicRepository) CreateSubject(ctx context.Context, tenantID string, params CreateSubjectParams) (Subject, error) {
	repo.capturedTenant = tenantID
	repo.capturedSubject = params
	if repo.err != nil {
		return Subject{}, repo.err
	}
	return Subject{ID: "subject-1", Code: params.Code, Name: params.Name, GroupName: params.GroupName, Status: "active"}, nil
}

func (repo *fakeAcademicRepository) ListCourseOfferings(ctx context.Context, tenantID string) ([]CourseOffering, error) {
	repo.capturedTenant = tenantID
	return repo.courseOfferings, repo.err
}

func (repo *fakeAcademicRepository) CreateCourseOffering(ctx context.Context, tenantID string, params CreateCourseOfferingParams) (CourseOffering, error) {
	repo.capturedTenant = tenantID
	repo.capturedOffering = params
	if repo.err != nil {
		return CourseOffering{}, repo.err
	}
	return CourseOffering{ID: "offering-1", SubjectID: params.SubjectID, ClassSectionID: params.ClassSectionID, AcademicYear: params.AcademicYear, Term: params.Term, Status: "active"}, nil
}

func (repo *fakeAcademicRepository) ListTeachingAssignments(ctx context.Context, tenantID string) ([]TeachingAssignment, error) {
	repo.capturedTenant = tenantID
	return repo.teachingAssignments, repo.err
}

func (repo *fakeAcademicRepository) CreateTeachingAssignment(ctx context.Context, tenantID string, params CreateTeachingAssignmentParams) (TeachingAssignment, error) {
	repo.capturedTenant = tenantID
	repo.capturedAssignment = params
	if repo.err != nil {
		return TeachingAssignment{}, repo.err
	}
	return TeachingAssignment{ID: "assignment-1", CourseOfferingID: params.CourseOfferingID, TeacherID: params.TeacherID, Role: params.Role, Status: "active"}, nil
}

func TestAcademicRoutesRequireTenantContext(t *testing.T) {
	handler := NewHandler(&fakeAcademicRepository{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/academic/subjects", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestListSubjectsReturnsTenantScopedSubjects(t *testing.T) {
	repo := &fakeAcademicRepository{subjects: []Subject{{ID: "subject-1", Code: "MAT", Name: "Matematika", GroupName: "Wajib", Status: "active"}}}
	handler := tenantctx.Middleware(NewHandler(repo))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/academic/subjects", nil)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedTenant != "tenant-1" {
		t.Fatalf("expected tenant-1 lookup, got %q", repo.capturedTenant)
	}
	var payload struct {
		Data []Subject `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if len(payload.Data) != 1 || payload.Data[0].Name != "Matematika" {
		t.Fatalf("unexpected subjects payload: %+v", payload.Data)
	}
}

func TestCreateSubjectNormalizesAndValidates(t *testing.T) {
	repo := &fakeAcademicRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic/subjects", bytes.NewBufferString(`{"code":" mat ","name":" Matematika ","groupName":" Wajib "}`))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedSubject.Code != "MAT" || repo.capturedSubject.Name != "Matematika" || repo.capturedSubject.GroupName != "Wajib" {
		t.Fatalf("unexpected subject params: %+v", repo.capturedSubject)
	}
}

func TestCreateSubjectRejectsShortName(t *testing.T) {
	handler := tenantctx.Middleware(NewHandler(&fakeAcademicRepository{}))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic/subjects", bytes.NewBufferString(`{"code":"MTK","name":"M"}`))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestCreateCourseOfferingCapturesAcademicLinks(t *testing.T) {
	repo := &fakeAcademicRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := `{"subjectId":"subject-1","classSectionId":"class-1","academicYear":"2026/2027","term":"ganjil"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic/course-offerings", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedOffering.SubjectID != "subject-1" || repo.capturedOffering.ClassSectionID != "class-1" || repo.capturedOffering.Term != "ganjil" {
		t.Fatalf("unexpected offering params: %+v", repo.capturedOffering)
	}
}

func TestCreateCourseOfferingRejectsInvalidTerm(t *testing.T) {
	handler := tenantctx.Middleware(NewHandler(&fakeAcademicRepository{}))
	body := `{"subjectId":"subject-1","classSectionId":"class-1","academicYear":"2026/2027","term":"summer"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic/course-offerings", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestCreateTeachingAssignmentCapturesTeacherLink(t *testing.T) {
	repo := &fakeAcademicRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := `{"courseOfferingId":"offering-1","teacherId":"teacher-1","role":"primary"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic/teaching-assignments", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedAssignment.CourseOfferingID != "offering-1" || repo.capturedAssignment.TeacherID != "teacher-1" || repo.capturedAssignment.Role != "primary" {
		t.Fatalf("unexpected assignment params: %+v", repo.capturedAssignment)
	}
}

func TestCreateTeachingAssignmentRejectsInvalidRole(t *testing.T) {
	handler := tenantctx.Middleware(NewHandler(&fakeAcademicRepository{}))
	body := `{"courseOfferingId":"offering-1","teacherId":"teacher-1","role":"observer"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic/teaching-assignments", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}
