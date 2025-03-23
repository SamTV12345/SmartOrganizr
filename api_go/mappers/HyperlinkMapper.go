package mappers

import (
	"api_go/constants"
	"github.com/gofiber/fiber/v2"
)

func GetLocal[T any](c *fiber.Ctx, key string) T {
	return c.Locals(key).(T)
}

func CreateHyperlink(c *fiber.Ctx, subPath string) string {
	var baseURL = GetLocal[string](c, constants.BaseURL)
	var formattedURL = baseURL
	return formattedURL + subPath
}
