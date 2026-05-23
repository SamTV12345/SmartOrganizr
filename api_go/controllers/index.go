package controllers

import (
	"api_go/controllers/dto"
	"github.com/gofiber/fiber/v3"
)

// GetIndex godoc
// @Summary  Public configuration (Keycloak realm/client)
// @Tags     public
// @Produce  json
// @Success  200  {object} dto.KeycloakModel
// @Router   /public [get]
func GetIndex(c fiber.Ctx) error {
	var keycloakModel = GetLocal[dto.KeycloakModel](c, "keycloak")
	return c.JSON(keycloakModel)
}
