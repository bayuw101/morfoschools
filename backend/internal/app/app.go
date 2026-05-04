package app

import (
	"encoding/json"
	"net/http"
)

type TenantResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Province    string `json:"province"`
	Plan        string `json:"plan"`
	Status      string `json:"status"`
	StudentCap  int    `json:"studentCap"`
	ActiveUsers int    `json:"activeUsers"`
}

type UserResponse struct {
	ID         string `json:"id"`
	TenantID   string `json:"tenantId"`
	TenantName string `json:"tenantName"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Role       string `json:"role"`
	Status     string `json:"status"`
	LastSeen   string `json:"lastSeen"`
}

type listResponse[T any] struct {
	Data []T `json:"data"`
}

var tenants = []TenantResponse{
	{
		ID:          "tenant-smp-morfosis",
		Name:        "SMP Morfosis Demo",
		Slug:        "smp-morfosis-demo",
		Province:    "Jawa Barat",
		Plan:        "Low Spec VPS",
		Status:      "active",
		StudentCap:  1200,
		ActiveUsers: 428,
	},
	{
		ID:          "tenant-sma-nusantara",
		Name:        "SMA Nusantara 2",
		Slug:        "sma-nusantara-2",
		Province:    "DI Yogyakarta",
		Plan:        "Standard",
		Status:      "setup",
		StudentCap:  1800,
		ActiveUsers: 94,
	},
}

var users = []UserResponse{
	{
		ID:         "usr-admin-001",
		TenantID:   "tenant-smp-morfosis",
		TenantName: "SMP Morfosis Demo",
		Name:       "Admin Sekolah",
		Email:      "admin@morfosis.local",
		Role:       "admin",
		Status:     "active",
		LastSeen:   "Baru saja",
	},
	{
		ID:         "usr-guru-001",
		TenantID:   "tenant-smp-morfosis",
		TenantName: "SMP Morfosis Demo",
		Name:       "Guru Matematika",
		Email:      "guru@morfosis.local",
		Role:       "teacher",
		Status:     "active",
		LastSeen:   "5 menit lalu",
	},
	{
		ID:         "usr-siswa-001",
		TenantID:   "tenant-smp-morfosis",
		TenantName: "SMP Morfosis Demo",
		Name:       "Siswa Demo",
		Email:      "siswa@morfosis.local",
		Role:       "student",
		Status:     "invited",
		LastSeen:   "Belum login",
	},
}

func NewServer() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthHandler)
	mux.HandleFunc("/api/v1/tenants", tenantsHandler)
	mux.HandleFunc("/api/v1/users", usersHandler)
	return withCORS(mux)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "morfoschools-api"})
}

func tenantsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, listResponse[TenantResponse]{Data: tenants})
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, listResponse[UserResponse]{Data: users})
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "http://localhost:3000"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Tenant-ID, X-User-ID, X-User-Role, X-Exam-Gate-Token, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeMethodNotAllowed(w http.ResponseWriter) {
	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
