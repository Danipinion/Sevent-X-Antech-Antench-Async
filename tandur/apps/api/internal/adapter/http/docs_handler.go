package http

import (
	_ "embed"

	"github.com/gofiber/fiber/v3"
)

//go:embed docs/swagger.html
var swaggerHTML []byte

//go:embed docs/scalar.html
var scalarHTML []byte

//go:embed docs/openapi.json
var openapiJSON []byte

//go:embed docs/openapi.yaml
var openapiYAML []byte

type DocsHandler struct{}

func NewDocsHandler() *DocsHandler {
	return &DocsHandler{}
}

func (h *DocsHandler) SwaggerUI(c fiber.Ctx) error {
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.Send(swaggerHTML)
}

func (h *DocsHandler) ScalarUI(c fiber.Ctx) error {
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.Send(scalarHTML)
}

func (h *DocsHandler) OpenAPISpecJSON(c fiber.Ctx) error {
	c.Set("Content-Type", "application/json; charset=utf-8")
	return c.Send(openapiJSON)
}

func (h *DocsHandler) OpenAPISpecYAML(c fiber.Ctx) error {
	c.Set("Content-Type", "application/x-yaml; charset=utf-8")
	return c.Send(openapiYAML)
}
