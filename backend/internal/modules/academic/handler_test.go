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
	subjectGroups       []SubjectGroup
	groupMembers        []SubjectGroupMember
	capturedTenant      string
	capturedSubject     CreateSubjectParams
	capturedOffering    CreateCourseOfferingParams
	capturedAssignment  CreateTeachingAssignmentParams
	capturedGroup       CreateSubjectGroupParams
	capturedMember      AddSubjectGroupMemberParams
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

func (repo *fakeAcademicRepository) ListSubjectGroups(ctx context.Context, tenantID string) ([]SubjectGroup, error) {
	repo.capturedTenant = tenantID
	return repo.subjectGroups, repo.err
}

func (repo *fakeAcademicRepository) CreateSubjectGroup(ctx context.Context, tenantID string, params CreateSubjectGroupParams) (SubjectGroup, error) {
	repo.capturedTenant = tenantID
	repo.capturedGroup = params
	if repo.err != nil {
		return SubjectGroup{}, repo.err
	}
	return SubjectGroup{ID: "group-1", SubjectID: params.SubjectID, Name: params.Name, AcademicYear: params.AcademicYear, Term: params.Term, Status: "active"}, nil
}

func (repo *fakeAcademicRepository) ListSubjectGroupMembers(ctx context.Context, tenantID string, groupID string) ([]SubjectGroupMember, error) {
	repo.capturedTenant = tenantID
	repo.capturedGroup.GroupID = groupID
	return repo.groupMembers, repo.err
}

func (repo *fakeAcademicRepository) AddSubjectGroupMember(ctx context.Context, tenantID string, groupID string, params AddSubjectGroupMemberParams) (SubjectGroupMember, error) {
	repo.capturedTenant = tenantID
	repo.capturedGroup.GroupID = groupID
	repo.capturedMember = params
	if repo.err != nil {
		return SubjectGroupMember{}, repo.err
	}
	return SubjectGroupMember{ID: "member-1", GroupID: groupID, StudentID: params.StudentID, Status: "active"}, nil
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

func TestListSubjectGroupsReturnsTenantScopedGroups(t *testing.T) {
	repo := &fakeAcademicRepository{subjectGroups: []SubjectGroup{{ID: "group-1", SubjectID: "subject-1", SubjectName: "Matematika", Name: "Matematika Lintas Minat", AcademicYear: "2026/2027", Term: "ganjil", Status: "active", MemberCount: 12}}}
	handler := tenantctx.Middleware(NewHandler(repo))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/academic/subject-groups", nil)
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
		Data []SubjectGroup `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if len(payload.Data) != 1 || payload.Data[0].MemberCount != 12 || payload.Data[0].Name != "Matematika Lintas Minat" {
		t.Fatalf("unexpected groups payload: %+v", payload.Data)
	}
}

func TestCreateSubjectGroupNormalizesAcademicScope(t *testing.T) {
	repo := &fakeAcademicRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := `{"subjectId":"subject-1","name":" Matematika Lintas Minat ","academicYear":"2026/2027","term":" Ganjil "}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic/subject-groups", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedGroup.SubjectID != "subject-1" || repo.capturedGroup.Name != "Matematika Lintas Minat" || repo.capturedGroup.Term != "ganjil" {
		t.Fatalf("unexpected group params: %+v", repo.capturedGroup)
	}
}

func TestCreateSubjectGroupRejectsInvalidTerm(t *testing.T) {
	handler := tenantctx.Middleware(NewHandler(&fakeAcademicRepository{}))
	body := `{"subjectId":"subject-1","name":"Group A","academicYear":"2026/2027","term":"summer"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic/subject-groups", bytes.NewBufferString(body))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestListSubjectGroupMembersCapturesGroupID(t *testing.T) {
	repo := &fakeAcademicRepository{groupMembers: []SubjectGroupMember{{ID: "member-1", GroupID: "group-1", StudentID: "student-1", StudentName: "Siswa A", ClassName: "10-A", Status: "active"}}}
	handler := tenantctx.Middleware(NewHandler(repo))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/academic/subject-groups/group-1/members", nil)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedGroup.GroupID != "group-1" {
		t.Fatalf("expected group-1 lookup, got %q", repo.capturedGroup.GroupID)
	}
	var payload struct {
		Data []SubjectGroupMember `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if len(payload.Data) != 1 || payload.Data[0].StudentName != "Siswa A" {
		t.Fatalf("unexpected members payload: %+v", payload.Data)
	}
}

func TestAddSubjectGroupMemberCapturesStudentLink(t *testing.T) {
	repo := &fakeAcademicRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic/subject-groups/group-1/members", bytes.NewBufferString(`{"studentId":"student-1"}`))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedGroup.GroupID != "group-1" || repo.capturedMember.StudentID != "student-1" {
		t.Fatalf("unexpected member params: group=%+v member=%+v", repo.capturedGroup, repo.capturedMember)
	}
}

func TestAddSubjectGroupMemberRejectsBlankStudent(t *testing.T) {
	handler := tenantctx.Middleware(NewHandler(&fakeAcademicRepository{}))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic/subject-groups/group-1/members", bytes.NewBufferString(`{"studentId":" "}`))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}
