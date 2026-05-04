package identity

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type fakeUserRepository struct {
	users          []User
	capturedTenant string
	capturedParams CreateUserParams
	err            error
}

func (repo *fakeUserRepository) ListUsers(ctx context.Context, tenantID string) ([]User, error) {
	repo.capturedTenant = tenantID
	return repo.users, repo.err
}

func (repo *fakeUserRepository) CreateUser(ctx context.Context, tenantID string, params CreateUserParams) (User, error) {
	repo.capturedTenant = tenantID
	repo.capturedParams = params
	if repo.err != nil {
		return User{}, repo.err
	}
	return User{ID: "user-1", Email: params.Email, Name: params.Name, Role: params.Role, Status: "invited"}, nil
}

func (repo *fakeUserRepository) UpdateUser(ctx context.Context, tenantID string, userID string, params CreateUserParams) (User, error) {
	repo.capturedTenant = tenantID
	repo.capturedParams = params
	if repo.err != nil {
		return User{}, repo.err
	}
	return User{ID: userID, Email: params.Email, Name: params.Name, Role: params.Role, Status: "active"}, nil
}

func (repo *fakeUserRepository) DeleteUser(ctx context.Context, tenantID string, userID string) error {
	repo.capturedTenant = tenantID
	if repo.err != nil {
		return repo.err
	}
	return nil
}

func TestListUsersRequiresTenantContext(t *testing.T) {
	repo := &fakeUserRepository{}
	handler := NewHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestListUsersReturnsTenantScopedUsers(t *testing.T) {
	repo := &fakeUserRepository{users: []User{{ID: "user-1", Email: "guru@example.sch.id", Name: "Guru A", Role: "teacher", Status: "active"}}}
	handler := tenantctx.Middleware(NewHandler(repo))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
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
		Data []User `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode users: %v", err)
	}
	if len(payload.Data) != 1 || payload.Data[0].Email != "guru@example.sch.id" {
		t.Fatalf("unexpected users payload: %+v", payload.Data)
	}
}

func TestCreateUserNormalizesAndStoresTenantMembership(t *testing.T) {
	repo := &fakeUserRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := bytes.NewBufferString(`{"email":" GURU@Example.sch.id ","name":" Guru A ","role":"teacher"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", body)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedTenant != "tenant-1" {
		t.Fatalf("expected tenant-1 create, got %q", repo.capturedTenant)
	}
	if repo.capturedParams.Email != "guru@example.sch.id" || repo.capturedParams.Name != "Guru A" || repo.capturedParams.Role != "teacher" {
		t.Fatalf("unexpected captured params: %+v", repo.capturedParams)
	}
}

func TestCreateUserRejectsInvalidRole(t *testing.T) {
	repo := &fakeUserRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", bytes.NewBufferString(`{"email":"user@example.sch.id","name":"User A","role":"superadmin"}`))
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestUpdateUserNormalizesAndStoresTenantMembership(t *testing.T) {
	repo := &fakeUserRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	body := bytes.NewBufferString(`{"email":" ADMIN@Example.sch.id ","name":" Admin A ","role":"admin"}`)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/user-1", body)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedTenant != "tenant-1" {
		t.Fatalf("expected tenant-1 update, got %q", repo.capturedTenant)
	}
	if repo.capturedParams.Email != "admin@example.sch.id" || repo.capturedParams.Name != "Admin A" || repo.capturedParams.Role != "admin" {
		t.Fatalf("unexpected captured params: %+v", repo.capturedParams)
	}
}

func TestDeleteUserRemovesTenantMembership(t *testing.T) {
	repo := &fakeUserRepository{}
	handler := tenantctx.Middleware(NewHandler(repo))
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/users/user-1", nil)
	req.Header.Set(tenantctx.HeaderName, "tenant-1")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if repo.capturedTenant != "tenant-1" {
		t.Fatalf("expected tenant-1 delete, got %q", repo.capturedTenant)
	}
}
