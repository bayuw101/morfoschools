package analytics

import (
	"encoding/json"
	"log"
	"net/http"
)

type Handler struct {
	Reader ClickHouseReader
}

func (h *Handler) GetExamAnalytics(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	examID := r.PathValue("examId")

	if tenantID == "" || examID == "" {
		http.Error(w, `{"error":"missing tenant or exam id"}`, http.StatusBadRequest)
		return
	}

	stats, err := h.Reader.GetExamStats(r.Context(), tenantID, examID)
	if err != nil {
		log.Printf("analytics query error: %v", err)
		http.Error(w, `{"error":"analytics query failed"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
