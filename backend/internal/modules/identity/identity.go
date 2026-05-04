package identity

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
)

type User struct {
	ID     string `json:"id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	Role   string `json:"role"`
	Status string `json:"status"`
}

type CreateUserParams struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

type Repository interface {
	ListUsers(ctx context.Context, tenantID string) ([]User, error)
	CreateUser(ctx context.Context, tenantID string, params CreateUserParams) (User, error)
}

type Handler struct {
	repo Repository
}

func NewHandler(repo Repository) http.Handler {
	return Handler{repo: repo}
}

func (handler Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		handler.list(w, r, tenantID)
	case http.MethodPost:
		handler.create(w, r, tenantID)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
	}
}

func (handler Handler) list(w http.ResponseWriter, r *http.Request, tenantID string) {
	users, err := handler.repo.ListUsers(r.Context(), tenantID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "list_users_failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string][]User{"data": users})
}

func (handler Handler) create(w http.ResponseWriter, r *http.Request, tenantID string) {
	var params CreateUserParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	params = normalizeCreateUserParams(params)
	if err := validateCreateUser(params); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	user, err := handler.repo.CreateUser(r.Context(), tenantID, params)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "create_user_failed"})
		return
	}
	writeJSON(w, http.StatusCreated, user)
}

func normalizeCreateUserParams(params CreateUserParams) CreateUserParams {
	params.Email = strings.ToLower(strings.TrimSpace(params.Email))
	params.Name = strings.TrimSpace(params.Name)
	params.Role = strings.TrimSpace(params.Role)
	return params
}

var emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

func validateCreateUser(params CreateUserParams) error {
	if !emailPattern.MatchString(params.Email) {
		return errors.New("invalid_email")
	}
	if len(params.Name) < 2 {
		return errors.New("name_too_short")
	}
	switch params.Role {
	case "owner", "admin", "teacher", "student":
		return nil
	default:
		return errors.New("invalid_role")
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
