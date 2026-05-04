package app

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestTenantAndUserEndpoints(t *testing.T) {
    srv := NewServer()

    t.Run("lists tenants", func(t *testing.T) {
        req := httptest.NewRequest(http.MethodGet, "/api/v1/tenants", nil)
        rec := httptest.NewRecorder()

        srv.ServeHTTP(rec, req)

        if rec.Code != http.StatusOK {
            t.Fatalf("expected 200, got %d", rec.Code)
        }

        var payload struct {
            Data []TenantResponse `json:"data"`
        }
        if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
            t.Fatalf("decode response: %v", err)
        }
        if len(payload.Data) == 0 {
            t.Fatal("expected seeded tenants")
        }
        if payload.Data[0].Slug == "" || payload.Data[0].Plan == "" {
            t.Fatalf("expected tenant slug and plan, got %+v", payload.Data[0])
        }
    })

    t.Run("lists users", func(t *testing.T) {
        req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
        rec := httptest.NewRecorder()

        srv.ServeHTTP(rec, req)

        if rec.Code != http.StatusOK {
            t.Fatalf("expected 200, got %d", rec.Code)
        }

        var payload struct {
            Data []UserResponse `json:"data"`
        }
        if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
            t.Fatalf("decode response: %v", err)
        }
        if len(payload.Data) == 0 {
            t.Fatal("expected seeded users")
        }
        if payload.Data[0].Role == "" || payload.Data[0].TenantName == "" {
            t.Fatalf("expected user role and tenant name, got %+v", payload.Data[0])
        }
    })
}
