package tenantctx

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

const HeaderName = "X-Tenant-ID"

type contextKey struct{}

func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantID := strings.TrimSpace(r.Header.Get(HeaderName))
		if tenantID != "" {
			r = r.WithContext(context.WithValue(r.Context(), contextKey{}, tenantID))
		}
		next.ServeHTTP(w, r)
	})
}

func Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if FromContext(r.Context()) == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "tenant_required"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func FromContext(ctx context.Context) string {
	value, _ := ctx.Value(contextKey{}).(string)
	return value
}
