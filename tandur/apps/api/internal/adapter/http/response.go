package http

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type TraceMeta struct {
	RequestID        string `json:"request_id"`
	CorrelationID    string `json:"correlation_id,omitempty"`
	TraceID          string `json:"trace_id"`
	SpanID           string `json:"span_id,omitempty"`
	Timestamp        string `json:"timestamp"`
	APIVersion       string `json:"api_version,omitempty"`
	ProcessingTimeMs int64  `json:"processing_time_ms,omitempty"`
	ServiceNode      string `json:"service_node,omitempty"`
}

type PaginationMeta struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

type Meta struct {
	Trace      TraceMeta       `json:"trace"`
	Pagination *PaginationMeta `json:"pagination,omitempty"`
}

type ErrorMeta struct {
	Trace TraceMeta `json:"trace"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type SuccessResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Meta    Meta        `json:"meta"`
}

type ErrorResponse struct {
	Status string      `json:"status"`
	Error  ErrorDetail `json:"error"`
	Meta   ErrorMeta   `json:"meta"`
}

var serviceNodeName string

func init() {
	h, err := os.Hostname()
	if err != nil || h == "" {
		serviceNodeName = "tandur-api-dev"
	} else {
		serviceNodeName = h
	}
}

func getOrInitTraceContext(c fiber.Ctx) (reqID, corrID, traceID, spanID string, startTime time.Time) {
	if t, ok := c.Locals("start_time").(time.Time); ok {
		startTime = t
	} else {
		startTime = time.Now()
		c.Locals("start_time", startTime)
	}

	if id, ok := c.Locals("request_id").(string); ok && id != "" {
		reqID = id
	} else {
		hdr := c.Get("X-Request-ID")
		if hdr != "" {
			if strings.HasPrefix(hdr, "req_") {
				reqID = hdr
			} else {
				reqID = "req_" + hdr
			}
		} else {
			reqID = "req_" + uuid.New().String()
		}
		c.Locals("request_id", reqID)
	}

	if id, ok := c.Locals("correlation_id").(string); ok && id != "" {
		corrID = id
	} else {
		hdr := c.Get("X-Correlation-ID")
		if hdr != "" {
			if strings.HasPrefix(hdr, "corr_") {
				corrID = hdr
			} else {
				corrID = "corr_" + hdr
			}
		} else {
			corrID = "corr_" + uuid.New().String()
		}
		c.Locals("correlation_id", corrID)
	}

	if id, ok := c.Locals("trace_id").(string); ok && id != "" {
		traceID = id
	} else {
		hdr := c.Get("X-Trace-ID")
		if hdr != "" {
			traceID = hdr
		} else {
			traceID = generateHex(16)
		}
		c.Locals("trace_id", traceID)
	}

	if id, ok := c.Locals("span_id").(string); ok && id != "" {
		spanID = id
	} else {
		spanID = generateHex(8)
		c.Locals("span_id", spanID)
	}

	c.Set("X-Request-ID", reqID)
	c.Set("X-Correlation-ID", corrID)
	c.Set("X-Trace-ID", traceID)

	return
}

func generateHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// RespondSuccess mengirim respons berhasil dengan objek meta.trace
func RespondSuccess(c fiber.Ctx, statusCode int, message string, data interface{}) error {
	return RespondSuccessWithPagination(c, statusCode, message, data, nil)
}

// RespondSuccessWithPagination mengirim respons berhasil lengkap dengan meta.trace dan meta.pagination
func RespondSuccessWithPagination(c fiber.Ctx, statusCode int, message string, data interface{}, pagination *PaginationMeta) error {
	reqID, corrID, traceID, spanID, startTime := getOrInitTraceContext(c)

	meta := Meta{
		Trace: TraceMeta{
			RequestID:        reqID,
			CorrelationID:    corrID,
			TraceID:          traceID,
			SpanID:           spanID,
			Timestamp:        time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
			APIVersion:       "v1.0.0",
			ProcessingTimeMs: time.Since(startTime).Milliseconds(),
			ServiceNode:      serviceNodeName,
		},
		Pagination: pagination,
	}

	return c.Status(statusCode).JSON(SuccessResponse{
		Status:  "success",
		Message: message,
		Data:    data,
		Meta:    meta,
	})
}

// RespondError mengirim respons error standar dengan objek meta.trace
func RespondError(c fiber.Ctx, statusCode int, code string, message string) error {
	reqID, corrID, traceID, _, _ := getOrInitTraceContext(c)

	meta := ErrorMeta{
		Trace: TraceMeta{
			RequestID:     reqID,
			CorrelationID: corrID,
			TraceID:       traceID,
			Timestamp:     time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
		},
	}

	return c.Status(statusCode).JSON(ErrorResponse{
		Status: "error",
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
		Meta: meta,
	})
}

// NewPaginationMeta helper untuk menghitung dan membuat PaginationMeta
func NewPaginationMeta(page, perPage int, totalItems int64) *PaginationMeta {
	if page <= 0 {
		page = 1
	}
	if perPage <= 0 {
		perPage = 20
	}
	totalPages := int((totalItems + int64(perPage) - 1) / int64(perPage))
	if totalPages == 0 {
		totalPages = 1
	}
	return &PaginationMeta{
		Page:       page,
		PerPage:    perPage,
		TotalItems: totalItems,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}
}
