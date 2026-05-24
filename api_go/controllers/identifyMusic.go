package controllers

import (
	"api_go/constants"
	"api_go/service"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// IdentifyMusicRequest carries a base64 image and an optional mime hint.
type IdentifyMusicRequest struct {
	// ImageBase64 is the raw base64 payload, *without* the "data:image/..." prefix.
	// Frontends that have a data: URL should strip the prefix before sending.
	ImageBase64 string `json:"imageBase64" validate:"required"`
	MimeType    string `json:"mimeType,omitempty"` // optional; defaults to image/jpeg
}

// PostIdentifyMusic godoc
// @Summary  Identify a piece of music from a photo using Infomaniak AI
// @Tags     ai
// @Accept   json
// @Produce  json
// @Param    body  body  IdentifyMusicRequest  true  "Image to identify"
// @Success  200   {object}  service.MusicIdentification
// @Failure  503   {object}  map[string]string  "AI service not configured"
// @Failure  502   {object}  map[string]string  "AI upstream error"
// @Router   /v1/ai/identify-music [post]
func PostIdentifyMusic(c fiber.Ctx) error {
	var req IdentifyMusicRequest
	if err := c.Bind().Body(&req); err != nil {
		return err
	}
	// Frontends sometimes ship the full data: URL by accident — strip it
	// here so we don't double-prefix in EuriaService.
	if i := strings.Index(req.ImageBase64, "base64,"); i >= 0 {
		req.ImageBase64 = req.ImageBase64[i+len("base64,"):]
	}
	if req.ImageBase64 == "" {
		return c.Status(400).JSON(fiber.Map{"error": "imageBase64 is required"})
	}

	ai := GetLocal[*service.AIService](c, constants.AIService)
	if ai == nil || !ai.IsConfigured() {
		return c.Status(503).JSON(fiber.Map{
			"error": "AI identification is not configured on this server",
		})
	}

	id, err := ai.IdentifyMusicFromImage(req.ImageBase64, req.MimeType)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(id)
}
