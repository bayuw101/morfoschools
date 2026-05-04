package tenancy

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"
)

type Tenant struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Province    string `json:"province"`
	Plan        string `json:"plan"`
	Status      string `json:"status"`
	StudentCap  int    `json:"studentCap"`
	ActiveUsers int    `json:"activeUsers"`
}

type CreateTenantParams struct {
	Name       string `json:"name"`
	Slug       string `json:"slug"`
	Province   string `json:"province"`
	Plan       string `json:"plan"`
	StudentCap int    `json:"studentCap"`
}

type Repository interface {
	ListTenants(context.Context) ([]Tenant, error)
	CreateTenant(context.Context, CreateTenantParams) (Tenant, error)
}

type Handler struct {
	repo Repository
}

func NewHandler(repo Repository) http.Handler {
	return Handler{repo: repo}
}

func (handler Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		handler.list(w, r)
	case http.MethodPost:
		handler.create(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
	}
}

func (handler Handler) list(w http.ResponseWriter, r *http.Request) {
	tenants, err := handler.repo.ListTenants(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list_tenants_failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string][]Tenant{"data": tenants})
}

func (handler Handler) create(w http.ResponseWriter, r *http.Request) {
	var params CreateTenantParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	params.Name = strings.TrimSpace(params.Name)
	params.Slug = strings.TrimSpace(params.Slug)
	params.Province = strings.TrimSpace(params.Province)
	params.Plan = strings.TrimSpace(params.Plan)
	params = applyCreateDefaults(params)
	if err := validateCreateTenant(params); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	tenant, err := handler.repo.CreateTenant(r.Context(), params)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "create_tenant_failed"})
		return
	}
	writeJSON(w, http.StatusCreated, tenant)
}

var slugPattern = regexp.MustCompile(`^[a-z0-9-]+$`)

func applyCreateDefaults(params CreateTenantParams) CreateTenantParams {
	if params.Province == "" {
		params.Province = "Indonesia"
	}
	if params.Plan == "" {
		params.Plan = "Low Spec VPS"
	}
	if params.StudentCap == 0 {
		params.StudentCap = 500
	}
	return params
}

func validateCreateTenant(params CreateTenantParams) error {
	if len(params.Name) < 3 {
		return errors.New("name_too_short")
	}
	if len(params.Slug) < 3 || !slugPattern.MatchString(params.Slug) {
		return errors.New("invalid_slug")
	}
	if params.Province == "" {
		return errors.New("province_required")
	}
	if params.Plan == "" {
		return errors.New("plan_required")
	}
	if params.StudentCap <= 0 {
		return errors.New("student_cap_required")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
