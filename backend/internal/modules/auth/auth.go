package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/bayuw101/morfoschools/internal/platform/tenantctx"
	"golang.org/x/crypto/bcrypt"
)

// ── domain types ──

type UserCredentials struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	PasswordHash string `json:"-"`
}

type Session struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenantId"`
	UserID    string    `json:"userId"`
	Token     string    `json:"token"`
	Role      string    `json:"role"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type CreateSessionParams struct {
	TenantID string
	UserID   string
	Role     string
	Token    string
	Duration time.Duration
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
	User      LoginUser `json:"user"`
}

type LoginUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

// ── repository interface ──

type Repository interface {
	FindUserByEmail(ctx context.Context, tenantID, email string) (*UserCredentials, error)
	CreateSession(ctx context.Context, params CreateSessionParams) (Session, error)
	FindSessionByToken(ctx context.Context, token string) (*Session, error)
	DeleteSession(ctx context.Context, token string) error
}

// ── password helpers ──

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func GenerateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "tok_" + hex.EncodeToString(bytes), nil
}

// ── handler ──

type Handler struct {
	repo        Repository
	rateLimiter LoginRateLimiter
}

func NewHandler(repo Repository) http.Handler {
	return Handler{repo: repo, rateLimiter: NewNopLoginRateLimiter()}
}

func NewHandlerWithRateLimiter(repo Repository, limiter LoginRateLimiter) http.Handler {
	if limiter == nil {
		limiter = NewNopLoginRateLimiter()
	}
	return Handler{repo: repo, rateLimiter: limiter}
}

func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/")
	switch {
	case strings.HasSuffix(path, "/login") && r.Method == http.MethodPost:
		h.login(w, r)
	case strings.HasSuffix(path, "/logout") && r.Method == http.MethodDelete:
		h.logout(w, r)
	case strings.HasSuffix(path, "/me") && r.Method == http.MethodGet:
		h.me(w, r)
	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	}
}

func (h Handler) login(w http.ResponseWriter, r *http.Request) {
	tenantID := tenantctx.FromContext(r.Context())
	if strings.TrimSpace(tenantID) == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant_required"})
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Password = strings.TrimSpace(req.Password)

	if req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "email_and_password_required"})
		return
	}

	// Rate limit check
	ip := r.RemoteAddr
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		ip = strings.Split(fwd, ",")[0]
	}
	allowed, _ := h.rateLimiter.Allow(r.Context(), tenantID, req.Email, strings.TrimSpace(ip))
	if !allowed {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "rate_limited"})
		return
	}

	user, err := h.repo.FindUserByEmail(r.Context(), tenantID, req.Email)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "login_failed"})
		return
	}
	if user == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_credentials"})
		return
	}

	if !CheckPassword(user.PasswordHash, req.Password) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_credentials"})
		return
	}

	token, err := GenerateToken()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token_generation_failed"})
		return
	}

	sess, err := h.repo.CreateSession(r.Context(), CreateSessionParams{
		TenantID: tenantID,
		UserID:   user.ID,
		Role:     user.Role,
		Token:    token,
		Duration: 24 * time.Hour,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "session_creation_failed"})
		return
	}

	writeJSON(w, http.StatusOK, LoginResponse{
		Token:     sess.Token,
		ExpiresAt: sess.ExpiresAt,
		User: LoginUser{
			ID:    user.ID,
			Email: user.Email,
			Name:  user.Name,
			Role:  user.Role,
		},
	})
}

func (h Handler) logout(w http.ResponseWriter, r *http.Request) {
	token := extractBearerToken(r)
	if token != "" {
		_ = h.repo.DeleteSession(r.Context(), token)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h Handler) me(w http.ResponseWriter, r *http.Request) {
	token := extractBearerToken(r)
	if token == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "token_required"})
		return
	}
	sess, err := h.repo.FindSessionByToken(r.Context(), token)
	if err != nil || sess == nil || time.Now().After(sess.ExpiresAt) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "session_invalid"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"userId":   sess.UserID,
		"tenantId": sess.TenantID,
		"role":     sess.Role,
	})
}

// ── session middleware ──

// SessionMiddleware checks for Authorization: Bearer <token> and injects
// X-User-ID, X-User-Role, X-Tenant-ID headers into the request so
// downstream middleware (authctx, tenantctx) works transparently.
// Falls back to existing dev headers when no bearer token is present.
func SessionMiddleware(repo Repository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractBearerToken(r)
			if token != "" {
				sess, err := repo.FindSessionByToken(r.Context(), token)
				if err == nil && sess != nil && time.Now().Before(sess.ExpiresAt) {
					r.Header.Set("X-User-ID", sess.UserID)
					r.Header.Set("X-User-Role", sess.Role)
					r.Header.Set("X-Tenant-ID", sess.TenantID)
				}
				// If token is invalid/expired, fall through to dev headers
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ── helpers ──

func extractBearerToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimSpace(auth[7:])
	}
	return ""
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
