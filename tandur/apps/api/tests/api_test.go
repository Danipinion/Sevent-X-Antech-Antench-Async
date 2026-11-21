package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"
	adapterHttp "tandur/api/internal/adapter/http"
	"tandur/api/internal/application"
	"tandur/api/internal/infrastructure/persistence"
)

func TestCommodityService(t *testing.T) {
	repo := persistence.NewMemoryCommodityRepository()
	service := application.NewCommodityService(repo)

	commodities, err := service.ListCommodities(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(commodities) == 0 {
		t.Errorf("expected seeded commodities, got 0")
	}
}

func TestPaginationAndTraceResponses(t *testing.T) {
	app := fiber.New()
	app.Use(adapterHttp.TraceMiddleware())

	app.Get("/test-pagination", func(c fiber.Ctx) error {
		pMeta := adapterHttp.NewPaginationMeta(1, 20, 478)
		items := []string{"item1", "item2"}
		return adapterHttp.RespondSuccessWithPagination(c, fiber.StatusOK, "Data paginasi berhasil", items, pMeta)
	})

	req := httptest.NewRequest(http.MethodGet, "/test-pagination", nil)
	req.Header.Set("X-Request-ID", "custom-req-123")
	req.Header.Set("X-Correlation-ID", "custom-corr-456")
	req.Header.Set("X-Trace-ID", "customtraceid0001")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Test request failed: %v", err)
	}

	var res struct {
		Status  string   `json:"status"`
		Message string   `json:"message"`
		Data    []string `json:"data"`
		Meta    struct {
			Trace struct {
				RequestID     string `json:"request_id"`
				CorrelationID string `json:"correlation_id"`
				TraceID       string `json:"trace_id"`
				SpanID        string `json:"span_id"`
				Timestamp     string `json:"timestamp"`
				APIVersion    string `json:"api_version"`
				ServiceNode   string `json:"service_node"`
			} `json:"trace"`
			Pagination struct {
				Page       int   `json:"page"`
				PerPage    int   `json:"per_page"`
				TotalItems int64 `json:"total_items"`
				TotalPages int   `json:"total_pages"`
				HasNext    bool  `json:"has_next"`
				HasPrev    bool  `json:"has_prev"`
			} `json:"pagination"`
		} `json:"meta"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}
	if res.Status != "success" {
		t.Errorf("Expected status success, got %s", res.Status)
	}
	if res.Meta.Trace.RequestID != "req_custom-req-123" {
		t.Errorf("Expected req_custom-req-123, got %s", res.Meta.Trace.RequestID)
	}
	if res.Meta.Trace.CorrelationID != "corr_custom-corr-456" {
		t.Errorf("Expected corr_custom-corr-456, got %s", res.Meta.Trace.CorrelationID)
	}
	if res.Meta.Trace.TraceID != "customtraceid0001" {
		t.Errorf("Expected customtraceid0001, got %s", res.Meta.Trace.TraceID)
	}
	if res.Meta.Pagination.TotalItems != 478 || res.Meta.Pagination.TotalPages != 24 || !res.Meta.Pagination.HasNext || res.Meta.Pagination.HasPrev {
		t.Errorf("Unexpected pagination values: %+v", res.Meta.Pagination)
	}
}
