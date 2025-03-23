package controllers

import (
	"api_go/controllers/dto"
	"api_go/mappers"
	"github.com/gofiber/fiber/v2"
)

type KeycloakModel struct {
	ClientId string              `json:"clientId"`
	Url      string              `json:"url"`
	Realm    string              `json:"realm"`
	Links    map[string]dto.Link `json:"_links"`
}

func GetIndex(c *fiber.Ctx) error {
	var formattedURL = mappers.CreateHyperlink(c, "/api/v1/authors?page=0")
	var keycloakModel = GetLocal[KeycloakModel](c, "keycloak")
	keycloakModel.Links["author"] = dto.Link{
		Href: formattedURL,
	}
	return c.JSON(keycloakModel)
}
