package http

import (
	"time"

	"github.com/gofiber/fiber/v3"
)

// TraceMiddleware menginisialisasi konteks pelacakan (request_id, correlation_id, trace_id, span_id, start_time)
func TraceMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		c.Locals("start_time", time.Now())
		getOrInitTraceContext(c)
		return c.Next()
	}
}
