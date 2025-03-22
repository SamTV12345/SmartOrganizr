package controllers

import (
	"api_go/mappers"
	"github.com/gofiber/fiber/v2"
)

type KeycloakModel struct {
	ClientId string            `json:"clientId"`
	Url      string            `json:"url"`
	Realm    string            `json:"realm"`
	Links    map[string]string `json:"_links"`
}

func GetIndex(c *fiber.Ctx) error {
	var formattedURL = mappers.CreateHyperlink(c, "/api/v1/authors")
	var keycloakModel = GetLocal[KeycloakModel](c, "keycloak")
	keycloakModel.Links["authors"] = formattedURL
	return c.JSON(keycloakModel)
}
