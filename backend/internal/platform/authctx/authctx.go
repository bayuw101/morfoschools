package authctx

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

const (
	UserIDHeader   = "X-User-ID"
	UserRoleHeader = "X-User-Role"
)

type User struct {
	ID   string
	Role string
}

type contextKey struct{}

func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := User{
			ID:   strings.TrimSpace(r.Header.Get(UserIDHeader)),
			Role: strings.TrimSpace(r.Header.Get(UserRoleHeader)),
		}
		ctx := context.WithValue(r.Context(), contextKey{}, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func FromContext(ctx context.Context) User {
	user, ok := ctx.Value(contextKey{}).(User)
	if !ok {
		return User{}
	}
	return user
}

func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	allowed := map[string]struct{}{}
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := FromContext(r.Context())
			if user.ID == "" || user.Role == "" {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "user_required"})
				return
			}
			if _, ok := allowed[user.Role]; !ok {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": "role_forbidden"})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func RequirePermission(permission Permission) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := FromContext(r.Context())
			if user.ID == "" || user.Role == "" {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "user_required"})
				return
			}
			if !Can(user.Role, permission) {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": "permission_forbidden"})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
