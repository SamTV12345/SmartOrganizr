package controllers

import (
	"api_go/controllers/dto"
	"github.com/gofiber/fiber/v2"
)

func GetIndex(c *fiber.Ctx) error {
	var keycloakModel = GetLocal[dto.KeycloakModel](c, "keycloak")
	return c.JSON(keycloakModel)
}
