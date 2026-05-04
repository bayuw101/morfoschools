package tenancy

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakeRepository struct {
	listResult []Tenant
	createFunc func(context.Context, CreateTenantParams) (Tenant, error)
	updateFunc func(context.Context, string, CreateTenantParams) (Tenant, error)
	deleteFunc func(context.Context, string) error
}

func (repo fakeRepository) ListTenants(ctx context.Context) ([]Tenant, error) {
	return repo.listResult, nil
}

func (repo fakeRepository) CreateTenant(ctx context.Context, params CreateTenantParams) (Tenant, error) {
	if repo.createFunc != nil {
		return repo.createFunc(ctx, params)
	}
	return Tenant{}, errors.New("unexpected create")
}

func (repo fakeRepository) UpdateTenant(ctx context.Context, id string, params CreateTenantParams) (Tenant, error) {
	if repo.updateFunc != nil {
		return repo.updateFunc(ctx, id, params)
	}
	return Tenant{}, errors.New("unexpected update")
}

func (repo fakeRepository) DeleteTenant(ctx context.Context, id string) error {
	if repo.deleteFunc != nil {
		return repo.deleteFunc(ctx, id)
	}
	return errors.New("unexpected delete")
}

func TestHandlerListsTenants(t *testing.T) {
	handler := NewHandler(fakeRepository{listResult: []Tenant{{ID: "tenant-1", Name: "SMP Demo", Slug: "smp-demo", Province: "Jawa Barat", Plan: "Low Spec VPS", Status: "active", StudentCap: 500}}})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/tenants", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var payload struct {
		Data []Tenant `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Data) != 1 || payload.Data[0].Slug != "smp-demo" {
		t.Fatalf("unexpected payload: %+v", payload)
	}
}

func TestHandlerCreatesTenant(t *testing.T) {
	handler := NewHandler(fakeRepository{createFunc: func(ctx context.Context, params CreateTenantParams) (Tenant, error) {
		if params.Name != "SMA Baru" || params.Slug != "sma-baru" || params.StudentCap != 700 {
			t.Fatalf("unexpected create params: %+v", params)
		}
		return Tenant{ID: "tenant-new", Name: params.Name, Slug: params.Slug, Province: params.Province, Plan: params.Plan, Status: "setup", StudentCap: params.StudentCap}, nil
	}})
	body := bytes.NewBufferString(`{"name":"SMA Baru","slug":"sma-baru","province":"Banten","plan":"Low Spec VPS","studentCap":700}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tenants", body)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d with body %s", rec.Code, rec.Body.String())
	}
}

func TestHandlerRejectsInvalidTenantPayload(t *testing.T) {
	handler := NewHandler(fakeRepository{})
	body := bytes.NewBufferString(`{"name":"","slug":"Bad Slug","studentCap":0}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tenants", body)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestHandlerCreatesTenantWithLowSpecDefaults(t *testing.T) {
	handler := NewHandler(fakeRepository{createFunc: func(ctx context.Context, params CreateTenantParams) (Tenant, error) {
		if params.Province != "Indonesia" {
			t.Fatalf("expected Indonesia default province, got %q", params.Province)
		}
		if params.Plan != "Low Spec VPS" {
			t.Fatalf("expected Low Spec VPS default plan, got %q", params.Plan)
		}
		if params.StudentCap != 500 {
			t.Fatalf("expected default student cap 500, got %d", params.StudentCap)
		}
		return Tenant{ID: "tenant-new", Name: params.Name, Slug: params.Slug, Province: params.Province, Plan: params.Plan, Status: "setup", StudentCap: params.StudentCap}, nil
	}})
	body := bytes.NewBufferString(`{"name":"Sekolah Demo","slug":"sekolah-demo"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tenants", body)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d with body %s", rec.Code, rec.Body.String())
	}
}

func TestHandlerUpdatesTenant(t *testing.T) {
	handler := NewHandler(fakeRepository{updateFunc: func(ctx context.Context, id string, params CreateTenantParams) (Tenant, error) {
		if id != "tenant-1" {
			t.Fatalf("expected id tenant-1, got %q", id)
		}
		if params.Name != "SMA Baru Updated" || params.Slug != "sma-baru-updated" || params.StudentCap != 1000 {
			t.Fatalf("unexpected update params: %+v", params)
		}
		return Tenant{ID: id, Name: params.Name, Slug: params.Slug, Province: params.Province, Plan: params.Plan, Status: "setup", StudentCap: params.StudentCap}, nil
	}})
	body := bytes.NewBufferString(`{"name":"SMA Baru Updated","slug":"sma-baru-updated","province":"Banten","plan":"Low Spec VPS","studentCap":1000}`)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/tenants/tenant-1", body)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", rec.Code, rec.Body.String())
	}
}

func TestHandlerDeletesTenant(t *testing.T) {
	handler := NewHandler(fakeRepository{deleteFunc: func(ctx context.Context, id string) error {
		if id != "tenant-1" {
			t.Fatalf("expected id tenant-1, got %q", id)
		}
		return nil
	}})
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/tenants/tenant-1", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d with body %s", rec.Code, rec.Body.String())
	}
}
