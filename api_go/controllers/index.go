package controllers

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
)

type KeycloakModel struct {
	ClientId string            `json:"clientId"`
	Url      string            `json:"url"`
	Realm    string            `json:"realm"`
	Links    map[string]string `json:"_links"`
}

func GetIndex(c *fiber.Ctx) error {
	var uri = c.Request().URI()
	println(string(c.Request().URI().Scheme()))
	println(string(uri.Host()))
	var formattedURL = fmt.Sprintf("%s://%s", uri.Scheme(), uri.Host())
	formattedURL += "/api/v1/authors"
	var keycloakModel = GetLocal[KeycloakModel](c, "keycloak")
	keycloakModel.Links["authors"] = formattedURL
	return c.JSON(keycloakModel)
}
